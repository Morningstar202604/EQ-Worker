import { describe, expect, it } from 'vitest';
import {
  buildPersonContext,
  builtinPipeline,
  runPipeline,
  type PipelineContext,
  type PipelineSettings
} from '../src/index';

const enabled: PipelineSettings = { enabled: true, requestTimeoutMs: 1000, previewBeforeSend: false };

function context(): PipelineContext {
  return {
    person: { id: 'p-1', name: '孙七', identity: '邻居' },
    context: buildPersonContext({ id: 'p-1', name: '孙七', identity: '邻居' }),
    input: { occasion: '乔迁' },
    outputs: {}
  };
}

describe('pipeline red lines', () => {
  it('falls back without a provider when the api key is missing', async () => {
    const result = await runPipeline(builtinPipeline.steps, context(), {
      settings: {
        ...enabled,
        provider: {
          id: 'openai',
          label: 'OpenAI',
          kind: 'openai',
          baseUrl: 'https://api.example.com/v1',
          model: 'gpt-4o-mini'
        }
      },
      fallback: () => ({ source: 'rule', advice: '本地规则兜底' })
    });

    expect(result.ok).toBe(false);
    expect(result.degraded).toBe(true);
    expect(result.error?.code).toBe('missing_key');
    expect(result.steps).toEqual([]);
    expect(result.output).toEqual({ source: 'rule', advice: '本地规则兜底' });
  });

  it('requires explicit approval when preview before send is enabled', async () => {
    let calls = 0;
    const result = await runPipeline(builtinPipeline.steps, context(), {
      settings: { enabled: true, requestTimeoutMs: 1000, previewBeforeSend: true },
      provider: {
        id: 'mock',
        label: 'Mock',
        kind: 'custom',
        chat: async () => {
          calls += 1;
          return { text: '{}', model: 'mock', providerId: 'mock' };
        }
      }
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('approval_required');
    expect(result.preview?.fields).toContain('relation');
    expect(calls).toBe(0);
  });

  it('does not expose the api key in any returned field', async () => {
    const apiKey = 'sk-pipeline-secret-abcdef';
    const result = await runPipeline([builtinPipeline.steps[0]], context(), {
      settings: enabled,
      apiKey,
      fetchImpl: async () =>
        new Response(JSON.stringify({ error: { message: `bad key ${apiKey}` } }), {
          status: 401,
          headers: { 'content-type': 'application/json' }
        }),
      fallback: (_ctx, cause) => ({ source: 'rule', detail: cause.message })
    });

    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain(apiKey);
  });
});
