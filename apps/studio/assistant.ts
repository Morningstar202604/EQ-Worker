import {
  FallbackChain,
  buildPersonContext,
  builtinPipeline,
  createFallbackHandler,
  createMockProvider,
  createProvider,
  redactPreview,
  ruleText,
  runPipeline,
  toAIError
} from '../../packages/ai/src/index';
import type {
  AIProvider,
  AISettings,
  ContextPolicy,
  FetchLike,
  PipelineContext,
  PipelineResult,
  ProviderConfig,
  ProviderKind,
  RedactedPreview
} from '../../packages/ai/src/index';
import type { AppState, Person } from '../../packages/core/src/index';

export interface AssistantForm {
  kind: ProviderKind;
  baseUrl: string;
  model: string;
  apiKey: string;
  mock: boolean;
}

export interface AssistantVariant {
  toneId: 'stable' | 'close' | 'brief';
  tone: string;
  text: string;
}

export interface AssistantGift {
  low: number;
  mid: number;
  high: number;
  reasons: string[];
}

export interface AssistantDisplay {
  sceneId: string;
  variants: AssistantVariant[];
  gift: AssistantGift | null;
  tips: string[];
  advice: string;
}

export type AssistantStatus = 'disabled' | 'preview' | 'ok' | 'offline';

export interface AssistantRunResult {
  status: AssistantStatus;
  preview: RedactedPreview | null;
  pipeline: PipelineResult | null;
  display: AssistantDisplay | null;
  offline: boolean;
  message: string;
}

export interface AssistantRunOptions {
  app: AppState;
  settings: AISettings;
  form: AssistantForm;
  personId?: string;
  scene?: string;
  note?: string;
  approved?: boolean;
  fetchImpl?: FetchLike;
  now?: number;
}

function providerConfig(form: AssistantForm): ProviderConfig {
  return {
    id: `studio-${form.kind}`,
    label: `Studio ${form.kind}`,
    kind: form.kind,
    baseUrl: form.baseUrl.trim(),
    model: form.model.trim()
  };
}

export function emptyAssistantDisplay(): AssistantDisplay {
  return { sceneId: 'other', variants: [], gift: null, tips: [], advice: '' };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function readText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

const TONE_LABELS: Record<'stable' | 'close' | 'brief', string> = {
  stable: '稳妥版',
  close: '亲近版',
  brief: '简短版'
};

function readVariants(source: unknown): AssistantVariant[] {
  if (Array.isArray(source)) {
    const out: AssistantVariant[] = [];
    for (const item of source) {
      const record = asRecord(item);
      if (!record) continue;
      const toneId = readText(record.toneId);
      const text = readText(record.text);
      if (!text) continue;
      if (toneId === 'stable' || toneId === 'close' || toneId === 'brief') {
        out.push({ toneId, tone: TONE_LABELS[toneId], text });
      } else {
        out.push({ toneId: 'stable', tone: readText(record.tone) || '稳妥版', text });
      }
    }
    return out;
  }
  const record = asRecord(source);
  if (!record) return [];
  const out: AssistantVariant[] = [];
  for (const toneId of ['stable', 'close', 'brief'] as const) {
    const text = readText(record[toneId]);
    if (text) out.push({ toneId, tone: TONE_LABELS[toneId], text });
  }
  return out;
}

function parseDisplay(output: unknown): AssistantDisplay {
  const record = asRecord(output);
  if (!record) return emptyAssistantDisplay();

  const sceneStep = asRecord(record.scene_detect);
  const scriptStep = asRecord(record.script_generate);
  const giftStep = asRecord(record.gift_advice);
  const reviewStep = asRecord(record.review);

  const sceneId = readText(sceneStep?.sceneId) || readText(record.sceneId) || 'other';
  let variants = readVariants(scriptStep?.variants);
  if (variants.length === 0) {
    variants = readVariants(record.script);
  }

  let gift: AssistantGift | null = null;
  const low = readNumber(giftStep?.low);
  const mid = readNumber(giftStep?.mid);
  const high = readNumber(giftStep?.high);
  if (low !== null && mid !== null && high !== null) {
    gift = {
      low,
      mid,
      high,
      reasons: Array.isArray(giftStep?.reasons)
        ? giftStep.reasons.map(readText).filter((item) => item.length > 0)
        : []
    };
  }

  const tips = Array.isArray(reviewStep?.tips)
    ? reviewStep.tips.map(readText).filter((item) => item.length > 0)
    : [];

  const advice = readText(record.advice);
  return { sceneId, variants, gift, tips, advice };
}

function pickPerson(app: AppState, personId?: string): Person | null {
  if (!app.persons.length) return null;
  if (personId) {
    const found = app.persons.find((person) => person.id === personId);
    if (found) return found;
  }
  return app.persons[0];
}

export function buildPipelineContext(
  app: AppState,
  person: Person,
  settings: AISettings,
  input: { scene: string; note: string },
  approved: boolean,
  now: number
): PipelineContext {
  const personInput = {
    id: person.id,
    name: person.name,
    identity: person.identity,
    birthday: person.birthday,
    note: person.note,
    likes: person.likes,
    taboos: person.taboos,
    events: app.events
      .filter((event) => event.personId === person.id)
      .map((event) => ({ type: event.type, title: event.title, amount: event.amount, time: event.time }))
  };
  const context = buildPersonContext(personInput, settings.contextPolicy, { now: new Date(now) });
  return {
    person: personInput,
    context,
    input: {
      text: input.note.trim(),
      scene: input.scene,
      sceneId: input.scene,
      occasion: input.scene
    },
    outputs: {},
    approved,
    policy: settings.contextPolicy,
    settings: { ...settings, enabled: settings.enabled }
  };
}

export function previewAssistantContext(
  app: AppState,
  person: Person,
  settings: AISettings,
  input: { scene: string; note: string },
  now: number
): RedactedPreview {
  const context = buildPipelineContext(app, person, settings, input, false, now);
  return redactPreview({
    system: context.context.system,
    user: context.context.user,
    fields: context.context.fields,
    redactions: context.context.redactions
  });
}

function mockResponses(): string[] {
  return [
    JSON.stringify({ sceneId: 'thanks', confidence: 0.92 }),
    JSON.stringify({
      variants: {
        stable: '顾清，上次搬家多亏你帮忙，东西都安顿好了。一直想正式说声谢谢，这周末我请你吃个饭。',
        close: '顾清，上次搬家真是救了我一命。别跟我客气，这周末火锅走起，我请。',
        brief: '顾清，上次搬家多谢了，周末请你吃饭。'
      }
    }),
    JSON.stringify({
      low: 300,
      mid: 500,
      high: 800,
      reasons: ['对方帮过搬家这一档子忙，按朋友关系给到中位', '线下请饭表达心意，礼金不必过高']
    }),
    JSON.stringify({
      tips: ['这周末之前把饭局定下来，别让感谢拖着变淡', '下次对方有事时主动问一句，把人情接上', '礼物按对方喜好挑，不必追求贵重']
    })
  ];
}

function offlineResult(context: PipelineContext, chain: FallbackChain, reason: 'missing_key' | 'error' | 'network' | 'timeout' | 'no_provider'): Promise<AssistantRunResult> {
  return chain.unavailable(context, reason).then((outcome) => {
    const display = parseDisplay(outcome.result);
    if (!display.variants.length) {
      const text = ruleText(outcome.result);
      if (text) display.variants = [{ toneId: 'stable', tone: '稳定版', text }];
    }
    return {
      status: 'offline',
      preview: null,
      pipeline: null,
      display,
      offline: true,
      message: '未配置可用 Provider 或调用失败，已切换到本地规则建议（离线建议）'
    };
  });
}

export async function runAssistant(options: AssistantRunOptions): Promise<AssistantRunResult> {
  const { app, settings, form, approved = false, now = Date.now() } = options;
  const person = pickPerson(app, options.personId);

  if (!person) {
    return {
      status: 'disabled',
      preview: null,
      pipeline: null,
      display: null,
      offline: false,
      message: '还没有人脉数据，先载入演示数据或导入 JSON'
    };
  }

  const input = { scene: options.scene?.trim() || '日常', note: options.note ?? '' };
  const context = buildPipelineContext(app, person, settings, input, approved, now);
  const preview = redactPreview({
    system: context.context.system,
    user: context.context.user,
    fields: context.context.fields,
    redactions: context.context.redactions
  });

  if (!settings.enabled) {
    const pipeline = await runPipeline(builtinPipeline, context, {
      settings: { ...settings, enabled: false }
    });
    return {
      status: 'disabled',
      preview: pipeline.preview ?? preview,
      pipeline,
      display: null,
      offline: false,
      message: 'AI 未启用'
    };
  }

  const config = providerConfig(form);
  const chain = new FallbackChain();

  if (!approved) {
    const pipeline = await runPipeline(builtinPipeline, context, {
      settings: { ...settings, provider: config, enabled: true }
    });
    return {
      status: 'preview',
      preview: pipeline.preview ?? preview,
      pipeline,
      display: null,
      offline: false,
      message: '发送前请确认预览内容'
    };
  }

  let provider: AIProvider;
  if (form.mock) {
    provider = createMockProvider(config, { responses: mockResponses() });
  } else {
    try {
      provider = createProvider(config, {
        apiKey: form.apiKey,
        ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {})
      });
    } catch (error) {
      const code = toAIError(error).code;
      const reason = code === 'missing_key' ? 'missing_key' : code === 'network' ? 'network' : 'error';
      const fallback = await offlineResult(context, chain, reason);
      return { ...fallback, preview };
    }
  }

  const pipeline = await runPipeline(builtinPipeline, { ...context, approved: true }, {
    provider,
    settings: { ...settings, provider: config, enabled: true },
    fallback: createFallbackHandler(chain),
    ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {})
  });

  if (pipeline.ok) {
    return {
      status: 'ok',
      preview: pipeline.preview ?? preview,
      pipeline,
      display: parseDisplay(pipeline.output),
      offline: false,
      message: 'AI 生成完成'
    };
  }

  const display = parseDisplay(pipeline.output);
  if (!display.variants.length) {
    const text = ruleText(asRecord(pipeline.output) ?? {});
    if (text) display.variants = [{ toneId: 'stable', tone: '稳定版', text }];
  }
  return {
    status: 'offline',
    preview: pipeline.preview ?? preview,
    pipeline,
    display,
    offline: true,
    message: pipeline.degraded
      ? 'AI 调用失败，已使用本地规则建议（离线建议）'
      : 'AI 未返回可用结果'
  };
}

export function policyEntries(): Array<{ key: keyof ContextPolicy; label: string; hint: string }> {
  return [
    { key: 'name', label: '姓名', hint: '关闭时以「对方」代替' },
    { key: 'birthday', label: '生日', hint: '仅保留近 7 天提示' },
    { key: 'notes', label: '备注', hint: '自由文本，可能含隐私' },
    { key: 'likes', label: '喜好', hint: '送礼参考' },
    { key: 'taboos', label: '忌讳', hint: '沟通避雷' },
    { key: 'events', label: '往来类型与金额区间', hint: '不含具体标题' }
  ];
}
