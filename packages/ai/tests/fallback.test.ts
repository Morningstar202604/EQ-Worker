import { describe, expect, it } from 'vitest';
import {
  FallbackChain,
  defaultRule,
  ruleText,
  type PipelineContext,
  type RuleHandler
} from '../src/index';
import { buildPersonContext } from '../src/index';

function makeContext(): PipelineContext {
  return {
    person: { id: 'p-1', name: '赵六', identity: '大学室友' },
    context: buildPersonContext({ id: 'p-1', name: '赵六', identity: '大学室友' }),
    input: { occasion: '生日' },
    outputs: {}
  };
}

describe('FallbackChain', () => {
  it('uses the rule function when no api key is configured', async () => {
    const seen: string[] = [];
    const rule: RuleHandler = (context) => {
      seen.push(String(context.personName));
      return { script: { stable: '本地稳妥版：先别急着开口。' } };
    };
    const chain = new FallbackChain({ rules: [rule] });

    const outcome = await chain.execute({ context: makeContext() });

    expect(outcome.ok).toBe(false);
    expect(outcome.used).toBe(true);
    expect(outcome.reason).toBe('no_provider');
    expect(seen).toEqual(['赵六']);
    expect(outcome.text).toBe('本地稳妥版：先别急着开口。');
  });

  it('reports missing_key when a provider exists without a key', async () => {
    const chain = new FallbackChain();
    const outcome = await chain.execute({
      context: makeContext(),
      provider: {
        id: 'x',
        label: 'x',
        kind: 'openai',
        chat: async () => ({ text: '', model: '', providerId: 'x' })
      },
      apiKey: '   '
    });

    expect(outcome.used).toBe(true);
    expect(outcome.reason).toBe('missing_key');
    expect(outcome.text.length).toBeGreaterThan(0);
  });

  it('falls back to rules when the network fails', async () => {
    const chain = new FallbackChain();
    const outcome = await chain.execute({
      context: makeContext(),
      apiKey: 'sk-live',
      call: async () => {
        throw Object.assign(new Error('socket hang up'), { code: 'network' });
      }
    });

    expect(outcome.used).toBe(true);
    expect(outcome.reason).toBe('network');
    expect(outcome.text.length).toBeGreaterThan(0);
    expect(outcome.text).toContain('赵六');
  });

  it('falls back to rules on timeout', async () => {
    const chain = new FallbackChain();
    const outcome = await chain.execute({
      context: makeContext(),
      apiKey: 'sk-live',
      call: async () => {
        throw Object.assign(new Error('slow'), { code: 'timeout' });
      }
    });

    expect(outcome.reason).toBe('timeout');
    expect(outcome.used).toBe(true);
  });

  it('does not fall back when the call succeeds', async () => {
    let ruleCalls = 0;
    const chain = new FallbackChain({
      rules: [
        () => {
          ruleCalls += 1;
          return { text: 'rule' };
        }
      ]
    });

    const outcome = await chain.execute({
      context: makeContext(),
      apiKey: 'sk-live',
      call: async () => 'ok'
    });

    expect(outcome.ok).toBe(true);
    expect(outcome.used).toBe(false);
    expect(ruleCalls).toBe(0);
  });

  it('returns presentable rule text for the default rule', () => {
    const result = defaultRule({ personName: '赵六', occasion: '生日' });
    const text = ruleText(result);

    expect(text.length).toBeGreaterThan(0);
    expect(text).toContain('赵六');
    expect(text).not.toContain('undefined');
  });

  it('skips a broken rule and uses the next one', async () => {
    const chain = new FallbackChain({
      rules: [
        () => {
          throw new Error('bad rule');
        },
        () => ({ advice: '备用规则可用' })
      ]
    });

    const outcome = await chain.execute({ context: makeContext() });

    expect(outcome.text).toBe('备用规则可用');
  });
});
