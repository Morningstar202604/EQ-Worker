import { AIErrorException } from './types';
import { redactPreview } from './context';
import type {
  AIProvider,
  ChatMessage,
  PipelineContext,
  PipelineDeps,
  PipelineDefinition,
  PipelineStep
} from './types';

export const SCENE_IDS = [
  'reconnect',
  'thanks',
  'apology',
  'ask_favor',
  'decline',
  'decline_invite',
  'refuse_loan',
  'collect_debt',
  'gift',
  'follow_up',
  'birthday',
  'anniversary',
  'invite',
  'toast',
  'visit_sick',
  'festival',
  'other'
] as const;

export type SceneId = (typeof SCENE_IDS)[number];

export interface ScriptVariant {
  toneId: 'stable' | 'close' | 'brief';
  tone: string;
  text: string;
}

export interface ScriptOutput {
  sceneId: string;
  variants: ScriptVariant[];
}

export interface GiftAdviceOutput {
  low: number;
  mid: number;
  high: number;
  currency: 'CNY';
  reasons: string[];
}

export interface ReviewOutput {
  tips: string[];
}

const TONES: readonly { toneId: ScriptVariant['toneId']; tone: string }[] = [
  { toneId: 'stable', tone: '稳妥版' },
  { toneId: 'close', tone: '亲近版' },
  { toneId: 'brief', tone: '简短版' }
];

function requireProvider(deps: PipelineDeps): AIProvider {
  if (!deps.provider) {
    throw new AIErrorException({ code: 'missing_provider', message: 'AI provider is not configured' });
  }
  return deps.provider;
}

function parseJsonObject(text: string): Record<string, unknown> {
  const withoutFence = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  const start = withoutFence.indexOf('{');
  const end = withoutFence.lastIndexOf('}');
  if (start < 0 || end <= start) {
    throw new AIErrorException({ code: 'invalid_response', message: 'Model output was not a JSON object' });
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(withoutFence.slice(start, end + 1));
  } catch {
    throw new AIErrorException({ code: 'invalid_response', message: 'Model output was not valid JSON' });
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new AIErrorException({ code: 'invalid_response', message: 'Model output was not a JSON object' });
  }
  return parsed as Record<string, unknown>;
}

function readText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function describeInput(ctx: PipelineContext): string {
  const input = ctx.input;
  const parts: string[] = [];
  const text = readText(input.text) || readText(input.scene) || readText(input.description);
  if (text) {
    parts.push(`用户描述：${text}`);
  }
  const occasion = readText(input.occasion);
  if (occasion) {
    parts.push(`场合：${occasion}`);
  }
  const relation = readText(input.relation);
  if (relation) {
    parts.push(`关系补充：${relation}`);
  }
  return parts.length > 0 ? parts.join('\n') : '用户未提供额外描述，请按已有关系信息处理。';
}

export function builtinPipelinePreview(ctx: PipelineContext) {
  return redactPreview({
    system: ctx.context.system,
    user: `${ctx.context.user}\n${describeInput(ctx)}`,
    fields: ctx.context.fields,
    redactions: ctx.context.redactions
  });
}

function messagesFor(ctx: PipelineContext, instruction: string): ChatMessage[] {
  const preview = ctx.outboundPreview ?? builtinPipelinePreview(ctx);
  return [
    {
      role: 'system',
      content: `${preview.system}\n你只输出一个 JSON 对象，不要输出 Markdown、解释或额外文字。`
    },
    {
      role: 'user',
      content: `${preview.user}\n\n${instruction}`
    }
  ];
}

async function chatJson(ctx: PipelineContext, deps: PipelineDeps, instruction: string): Promise<Record<string, unknown>> {
  const provider = requireProvider(deps);
  const response = await provider.chat({
    messages: messagesFor(ctx, instruction),
    ...(deps.signal ? { signal: deps.signal } : {})
  });
  return parseJsonObject(response.text);
}

function buildSceneStep(): PipelineStep {
  return {
    id: 'scene_detect',
    timeoutMs: 10_000,
    async run(ctx, deps) {
      const payload = await chatJson(
        ctx,
        deps,
        `判断当前人情场景，sceneId 必须从以下列表中选择一个：${SCENE_IDS.join('、')}。
输出格式：{"sceneId":"thanks","confidence":0.8}`
      );
      const sceneId = readText(payload.sceneId);
      if (!sceneId) {
        throw new AIErrorException({ code: 'invalid_response', message: 'sceneId is missing from model output' });
      }
      return { sceneId };
    }
  };
}

function buildScriptStep(): PipelineStep {
  return {
    id: 'script_generate',
    timeoutMs: 20_000,
    async run(ctx, deps) {
      const payload = await chatJson(
        ctx,
        deps,
        `根据场景写三条中文微信话术，分别对应稳妥、亲近、简短三种语气。
输出格式：{"variants":{"stable":"...","close":"...","brief":"..."}}`
      );
      const raw = payload.variants;
      const record =
        typeof raw === 'object' && raw !== null && !Array.isArray(raw)
          ? (raw as Record<string, unknown>)
          : payload;
      const variants = TONES.map(({ toneId, tone }) => {
        const text = readText(record[toneId]);
        if (!text) {
          throw new AIErrorException({ code: 'invalid_response', message: `variant ${toneId} is missing` });
        }
        return { toneId, tone, text };
      });
      const sceneId = readText(ctx.outputs.scene_detect && typeof ctx.outputs.scene_detect === 'object'
        ? (ctx.outputs.scene_detect as Record<string, unknown>).sceneId
        : '');
      return { sceneId: sceneId || 'other', variants };
    }
  };
}

function buildGiftStep(): PipelineStep {
  return {
    id: 'gift_advice',
    timeoutMs: 15_000,
    async run(ctx, deps) {
      const payload = await chatJson(
        ctx,
        deps,
        `给出礼金建议区间，金额为人民币整数，low <= mid <= high。
输出格式：{"low":300,"mid":500,"high":800,"reasons":["按关系亲疏","按场合行情"]}`
      );
      const low = readNumber(payload.low);
      const mid = readNumber(payload.mid);
      const high = readNumber(payload.high);
      if (low === null || mid === null || high === null) {
        throw new AIErrorException({ code: 'invalid_response', message: 'gift amounts must be numbers' });
      }
      if (low < 0 || mid < low || high < mid) {
        throw new AIErrorException({ code: 'invalid_response', message: 'gift amounts must satisfy low <= mid <= high' });
      }
      const reasons = Array.isArray(payload.reasons)
        ? payload.reasons.map(readText).filter((item) => item.length > 0)
        : [];
      return { low, mid, high, currency: 'CNY', reasons };
    }
  };
}

function buildReviewStep(): PipelineStep {
  return {
    id: 'review',
    timeoutMs: 15_000,
    async run(ctx, deps) {
      const payload = await chatJson(
        ctx,
        deps,
        `基于以上结果给出三条复盘建议，聚焦下次见面、回礼节奏和边界提醒。
输出格式：{"tips":["建议一","建议二","建议三"]}`
      );
      const tips = Array.isArray(payload.tips)
        ? payload.tips.map(readText).filter((item) => item.length > 0)
        : [];
      if (tips.length < 3) {
        throw new AIErrorException({ code: 'invalid_response', message: 'review requires at least three tips' });
      }
      return { tips: tips.slice(0, 3) };
    }
  };
}

export const sceneDetectStep: PipelineStep = buildSceneStep();
export const scriptGenerateStep: PipelineStep = buildScriptStep();
export const giftAdviceStep: PipelineStep = buildGiftStep();
export const reviewStep: PipelineStep = buildReviewStep();

export const BUILTIN_PIPELINE_ID = 'eqworker_builtin';

export const builtinPipeline: PipelineDefinition = {
  id: BUILTIN_PIPELINE_ID,
  label: '场景识别 → 话术生成 → 礼金建议 → 复盘建议',
  steps: [sceneDetectStep, scriptGenerateStep, giftAdviceStep, reviewStep]
};

export const BUILTIN_PIPELINES: readonly PipelineDefinition[] = [builtinPipeline];

export function getBuiltinPipeline(id = BUILTIN_PIPELINE_ID): PipelineDefinition {
  const found = BUILTIN_PIPELINES.find((pipeline) => pipeline.id === id);
  if (!found) {
    throw new AIErrorException({ code: 'bad_request', message: `Unknown pipeline: ${id}` });
  }
  return found;
}
