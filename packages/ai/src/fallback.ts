import { maskSecrets } from './context';
import type { AIError, AIProvider, PipelineContext } from './types';

export interface RuleContext {
  personName?: string;
  relation?: string;
  occasion?: string;
  sceneId?: string;
}

export type RuleResult = Record<string, unknown>;

export type RuleHandler = (context: RuleContext) => RuleResult | Promise<RuleResult>;

export interface FallbackChainOptions {
  rules?: RuleHandler[];
}

export type FallbackReason = 'no_provider' | 'missing_key' | 'network' | 'timeout' | 'error';

export interface FallbackOutcome {
  ok: boolean;
  used: boolean;
  reason?: FallbackReason;
  text: string;
  result: RuleResult;
}

export interface FallbackExecuteOptions {
  context: PipelineContext;
  provider?: AIProvider;
  apiKey?: string;
  call?: () => Promise<unknown>;
}

const NETWORK_CODES = new Set(['network', 'rate_limit', 'server']);
const TIMEOUT_CODES = new Set(['timeout', 'aborted']);

function readString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function ruleText(result: RuleResult): string {
  const script = result.script;
  if (typeof script === 'string' && script.trim()) {
    return script.trim();
  }
  if (typeof script === 'object' && script !== null && !Array.isArray(script)) {
    const variants = script as Record<string, unknown>;
    const stable = readString(variants.stable).trim();
    if (stable) {
      return stable;
    }
  }
  const advice = result.advice;
  if (typeof advice === 'string' && advice.trim()) {
    return advice.trim();
  }
  return '当前使用本地规则给出建议，仅供参考，请结合真实相处方式调整。';
}

export function defaultRuleContext(context: PipelineContext): RuleContext {
  const person = context.person;
  return {
    personName: person.name,
    relation: person.identity ?? person.relation,
    occasion: readString(context.input.occasion) || undefined,
    sceneId: readString(context.input.sceneId) || undefined
  };
}

export function defaultRule(context: RuleContext): RuleResult {
  const info = context;
  const who = info.personName?.trim() ? info.personName.trim() : '对方';
  const occasion = info.occasion?.trim() ? info.occasion.trim() : '这次';
  return {
    source: 'rule',
    script: {
      stable: `${who}，关于${occasion}，我认真想过了。先按咱们平时的相处方式来，有需要我配合的地方你直接说。`,
      close: `${who}，${occasion}这事我记着了。你别跟我客气，有需要随时招呼。`,
      brief: `${who}，${occasion}的事我知道了，随时联系。`
    },
    advice: `本地规则：涉及${occasion}时，先确认对方真实需求，再给出具体回应，避免过度承诺。`
  };
}

export class FallbackChain {
  private readonly rules: RuleHandler[];

  constructor(options: FallbackChainOptions = {}) {
    this.rules = options.rules && options.rules.length > 0 ? options.rules.slice() : [defaultRule];
  }

  async execute(options: FallbackExecuteOptions): Promise<FallbackOutcome> {
    if (!options.provider && (!options.apiKey || options.apiKey.trim() === '')) {
      return this.useRules(options.context, 'no_provider');
    }
    if (!options.apiKey || options.apiKey.trim() === '') {
      return this.useRules(options.context, 'missing_key');
    }
    try {
      await options.call?.();
      return { ok: true, used: false, text: '', result: {} };
    } catch (thrown) {
      return this.useRules(options.context, reasonFor(normalize(thrown)));
    }
  }

  async run(context: PipelineContext, task: () => Promise<unknown>, error?: AIError): Promise<FallbackOutcome> {
    try {
      await task();
      return { ok: true, used: false, text: '', result: {} };
    } catch (thrown) {
      const normalized = error ?? normalize(thrown);
      return this.useRules(context, reasonFor(normalized));
    }
  }

  async unavailable(context: PipelineContext, reason: FallbackReason): Promise<FallbackOutcome> {
    return this.useRules(context, reason);
  }

  private async useRules(context: PipelineContext, reason: FallbackReason): Promise<FallbackOutcome> {
    const ruleContext = defaultRuleContext(context);
    for (const rule of this.rules) {
      try {
        const result = await rule(ruleContext);
        return { ok: false, used: true, reason, text: ruleText(result), result };
      } catch {
        continue;
      }
    }
    const result = defaultRule(ruleContext);
    return { ok: false, used: true, reason, text: ruleText(result), result };
  }
}

function normalize(error: unknown): AIError {
  if (typeof error === 'object' && error !== null) {
    const record = error as Record<string, unknown>;
    if (typeof record.code === 'string' && typeof record.message === 'string') {
      return { code: record.code as AIError['code'], message: maskSecrets(record.message) };
    }
  }
  return {
    code: 'unknown',
    message: maskSecrets(error instanceof Error ? error.message : 'unknown error')
  };
}

function reasonFor(error: AIError): FallbackReason {
  if (NETWORK_CODES.has(error.code)) {
    return 'network';
  }
  if (TIMEOUT_CODES.has(error.code)) {
    return 'timeout';
  }
  return 'error';
}

export function createFallbackHandler(
  chain: FallbackChain
): (context: PipelineContext, cause: AIError) => Promise<RuleResult> {
  return async (context: PipelineContext, cause: AIError): Promise<RuleResult> => {
    const outcome = await chain.unavailable(
      context,
      cause.code === 'missing_key' ? 'missing_key' : reasonFor(cause)
    );
    return outcome.result;
  };
}
