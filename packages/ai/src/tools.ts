/**
 * AI 工具调用：让模型能查本地数据，而不是凭空编。
 *
 * 为什么需要：现在的 AI 只做「文本改写」——我们算好金额，它把理由说顺。
 * 但用户真正会问的是「张叔儿子下月结婚我该随多少」，这需要模型自己去查张叔是谁、
 * 什么关系、以前给过多少。没有工具调用，模型只能编一个数字。
 *
 * 安全边界（每条都有对应测试）：
 * 1. 工具白名单：只暴露只读查询，没有任何写操作。
 * 2. 结果裁剪：返回给模型的是聚合后的结论，不是原始通讯录。
 * 3. 单轮上限：一次对话最多调用 N 次工具，防止模型死循环烧额度。
 * 4. 名称脱敏：除非用户显式允许，否则人名替换为「这位朋友」。
 */
import { buildActions } from '../../core/src/actions';
import { giftAdvice, personLedger, balanceByKind } from '../../core/src/ledger';
import { healthRanking } from '../../core/src/health';
import { buildScripts, SCRIPT_SCENES } from '../../core/src/scripts';
import { OCCASIONS } from '../../core/src/constants';
import { etiquetteTips } from '../../core/src/etiquette';
import type { AppState, Person } from '../../core/src/types';

/** 工具定义：交给模型的 JSON Schema。 */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ToolCallResult {
  name: string;
  /** 返回给模型的文本（已是裁剪后的结论，不是原始数据）。 */
  content: string;
  ok: boolean;
}

export interface ToolContext {
  state: AppState;
  /** 是否允许把真实姓名发给模型。默认 false。 */
  allowNames?: boolean;
  now?: number;
}

/** 工具白名单。只读，无副作用。 */
export const TOOL_DEFINITIONS: readonly ToolDefinition[] = Object.freeze([
  {
    name: 'find_person',
    description: '按姓名或关键词查找人脉，返回其关系身份与最近往来概况。用于确认用户说的是谁。',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '姓名或关键词，如「张叔」' }
      },
      required: ['query']
    }
  },
  {
    name: 'gift_advice',
    description: '查询某人在某场合的随礼金额建议（三档 + 依据）。必须先用 find_person 拿到 personId。',
    parameters: {
      type: 'object',
      properties: {
        personId: { type: 'string', description: '人脉 id' },
        occasion: { type: 'string', enum: OCCASIONS as unknown as string[], description: '场合' }
      },
      required: ['personId', 'occasion']
    }
  },
  {
    name: 'person_ledger',
    description: '查询与某人的借款余额与礼金余额。两者分开，不要混算。',
    parameters: {
      type: 'object',
      properties: { personId: { type: 'string' } },
      required: ['personId']
    }
  },
  {
    name: 'etiquette_rules',
    description: '查询某场合的礼俗禁忌（该避什么、该注意什么）。',
    parameters: {
      type: 'object',
      properties: {
        occasion: { type: 'string', enum: OCCASIONS as unknown as string[], description: '场合' },
        identity: { type: 'string', description: '关系身份，如领导/同事/长辈，可选' }
      },
      required: ['occasion']
    }
  },
  {
    name: 'script_scene',
    description: '生成某场景的话术（三种语气）。场景 id 可先查 list_scenes。',
    parameters: {
      type: 'object',
      properties: {
        sceneId: { type: 'string', description: '场景 id' },
        personId: { type: 'string', description: '人脉 id，可选' },
        context: { type: 'string', description: '补充背景，可选' }
      },
      required: ['sceneId']
    }
  },
  {
    name: 'list_scenes',
    description: '列出全部话术场景 id 与名称。',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'today_actions',
    description: '列出今天值得处理的人情事项（按紧急度排序）。',
    parameters: {
      type: 'object',
      properties: { limit: { type: 'number', description: '最多几条，默认 5' } }
    }
  },
  {
    name: 'health_ranking',
    description: '列出最需要经营的关系（健康度从低到高）。',
    parameters: {
      type: 'object',
      properties: { limit: { type: 'number', description: '最多几条，默认 5' } }
    }
  }
]);

const TOOL_NAMES = new Set(TOOL_DEFINITIONS.map((t) => t.name));

/** 单次对话允许的最大工具调用次数，防止模型死循环。 */
export const MAX_TOOL_CALLS = 6;

function displayName(p: Person, allow: boolean): string {
  return allow ? p.name : '这位朋友';
}

function findPersons(state: AppState, query: string): Person[] {
  const q = String(query || '').trim();
  if (!q) return [];
  const exact = state.persons.filter((p) => p.name === q);
  if (exact.length) return exact.slice(0, 3);
  return state.persons.filter((p) => p.name.includes(q) || (p.tags || []).some((t) => t.includes(q))).slice(0, 3);
}

function money(n: number): string {
  return '¥' + Math.round(n).toLocaleString('zh-CN');
}

/**
 * 执行一次工具调用。未知工具名会被拒绝，不会静默放过。
 */
export function runTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext
): ToolCallResult {
  if (!TOOL_NAMES.has(name)) {
    return { name, ok: false, content: `未知工具：${name}。可用工具：${[...TOOL_NAMES].join(', ')}` };
  }
  const now = ctx.now ?? Date.now();
  const allow = ctx.allowNames === true;
  const state = ctx.state;

  try {
    switch (name) {
      case 'find_person': {
        const hits = findPersons(state, String(args.query ?? ''));
        if (!hits.length) return { name, ok: true, content: '没有找到匹配的人脉。' };
        const lines = hits.map((p) => {
          const l = personLedger(state, p.id, now);
          return `${displayName(p, allow)}（id=${p.id}，关系=${p.identity || '朋友'}）：借款 ${l.net === 0 ? '两清' : money(Math.abs(l.net))}`;
        });
        return { name, ok: true, content: lines.join('\n') };
      }
      case 'gift_advice': {
        const personId = String(args.personId ?? '');
        const occasion = String(args.occasion ?? '');
        if (!state.persons.some((p) => p.id === personId)) {
          return { name, ok: false, content: 'personId 不存在，请先调用 find_person。' };
        }
        const a = giftAdvice(state, personId, occasion, { now });
        return {
          name,
          ok: true,
          content: `${a.occasion}建议：从简 ${money(a.low)} / 建议 ${money(a.mid)} / 重视 ${money(a.high)}。依据：${a.reasons.join('；')}`
        };
      }
      case 'person_ledger': {
        const personId = String(args.personId ?? '');
        if (!state.persons.some((p) => p.id === personId)) {
          return { name, ok: false, content: 'personId 不存在。' };
        }
        const bal = balanceByKind(state, personId, now);
        const fmt = (v: number): string => (v === 0 ? '两清' : v > 0 ? `我欠 ${money(v)}` : `对方欠我 ${money(-v)}`);
        return { name, ok: true, content: `借款：${fmt(bal.loan)}；礼金：${fmt(bal.gift)}。两者不能互相折算。` };
      }
      case 'etiquette_rules': {
        const occasion = String(args.occasion ?? '');
        const identity = String(args.identity ?? '');
        const tips = etiquetteTips(occasion, identity);
        if (!tips.length) return { name, ok: true, content: '该场合没有特别的通行禁忌。' };
        return { name, ok: true, content: tips.map((t) => `${t.severity === 'high' ? '【务必避】' : '·'} ${t.text}`).join('\n') };
      }
      case 'script_scene': {
        const sceneId = String(args.sceneId ?? '');
        if (!SCRIPT_SCENES.some((s) => s.id === sceneId)) {
          return { name, ok: false, content: `未知场景 ${sceneId}，请先调用 list_scenes。` };
        }
        const personId = String(args.personId ?? '');
        const r = buildScripts(state, sceneId, personId, String(args.context ?? ''));
        return { name, ok: true, content: r.variants.map((v) => `【${v.tone}】${v.text}`).join('\n') };
      }
      case 'list_scenes': {
        return { name, ok: true, content: SCRIPT_SCENES.map((s) => `${s.id}：${s.label}`).join('\n') };
      }
      case 'today_actions': {
        const limit = Math.min(Math.max(Number(args.limit) || 5, 1), 20);
        const acts = buildActions(state, limit, now);
        if (!acts.length) return { name, ok: true, content: '今天没有需要紧急处理的人情事。' };
        return { name, ok: true, content: acts.map((a) => `${a.title} —— ${a.reason}`).join('\n') };
      }
      case 'health_ranking': {
        const limit = Math.min(Math.max(Number(args.limit) || 5, 1), 20);
        const rows = healthRanking(state, now).slice(0, limit);
        if (!rows.length) return { name, ok: true, content: '还没有可评估的人脉。' };
        return { name, ok: true, content: rows.map((x) => `${displayName(x.p, allow)}：${x.h.score} 分（${x.h.level}）——${x.h.tips[0]}`).join('\n') };
      }
      default:
        return { name, ok: false, content: `未实现的工具：${name}` };
    }
  } catch (e) {
    return { name, ok: false, content: `工具执行失败：${(e as Error).message}` };
  }
}

/** 供 UI 展示「这个 AI 能查什么」，避免用户不知道能力边界。 */
export function toolCatalog(): Array<{ name: string; description: string }> {
  return TOOL_DEFINITIONS.map((t) => ({ name: t.name, description: t.description }));
}
