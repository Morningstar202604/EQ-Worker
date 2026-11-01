import { describe, expect, it } from 'vitest';
import {
  buildPersonContext,
  builtinPipeline,
  createProvider,
  runPipeline,
  type FetchLike,
  type PipelineContext,
  type ProviderConfig
} from '../src/index';

const config: ProviderConfig = {
  id: 'openai',
  label: 'OpenAI',
  kind: 'openai',
  baseUrl: 'https://api.example.com/v1',
  model: 'gpt-4o-mini'
};

function makeContext(): PipelineContext {
  return {
    person: { id: 'p-1', name: '王五', identity: '同事' },
    context: buildPersonContext({ id: 'p-1', name: '王五', identity: '同事' }),
    input: { occasion: '同事结婚' },
    outputs: {}
  };
}

describe('AI disabled by default', () => {
  it('starts disabled with no provider configured', async () => {
    const { defaultAISettings } = await import('../src/index');
    const settings = defaultAISettings();

    expect(settings.enabled).toBe(false);
    expect(settings.provider).toBeNull();
  });

  it('returns reason=disabled before any fetch happens', async () => {
    const calls: string[] = [];
    const fetchImpl: FetchLike = async (url) => {
      calls.push(url);
      return new Response('{}', { status: 200 });
    };

    const provider = createProvider(config, { fetchImpl, apiKey: 'sk-should-not-be-used' });
    const result = await runPipeline(builtinPipeline.steps, makeContext(), {
      provider,
      fetchImpl,
      apiKey: 'sk-should-not-be-used',
      settings: { enabled: false, provider: config }
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('disabled');
    expect(result.steps).toEqual([]);
    expect(calls).toHaveLength(0);
  });

  it('keeps fetch at zero even when settings are omitted entirely', async () => {
    let calls = 0;
    const deps = {
      provider: createProvider(config, {
        fetchImpl: async () => {
          calls += 1;
          return new Response('{}', { status: 200 });
        },
        apiKey: 'sk-should-not-be-used'
      })
    };

    const result = await runPipeline(builtinPipeline.steps, makeContext(), deps);

    expect(result.reason).toBe('disabled');
    expect(calls).toBe(0);
  });

  it('does not call fetch for a disabled pipeline that builds its own provider', async () => {
    let calls = 0;
    const fetchImpl: FetchLike = async () => {
      calls += 1;
      return new Response('{}', { status: 200 });
    };

    const result = await runPipeline(builtinPipeline.steps, makeContext(), {
      fetchImpl,
      apiKey: 'sk-should-not-be-used',
      settings: { enabled: false, provider: config }
    });

    expect(result.reason).toBe('disabled');
    expect(calls).toBe(0);
  });

  it('proves the enabled pipeline does reach fetch, so the zero count is meaningful', async () => {
    let calls = 0;
    const fetchImpl: FetchLike = async () => {
      calls += 1;
      return new Response(
        JSON.stringify({ choices: [{ message: { content: '{"sceneId":"wedding"}' } }] }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      );
    };

    const result = await runPipeline([builtinPipeline.steps[0]], makeContext(), {
      fetchImpl,
      apiKey: 'sk-enabled-path',
      settings: { enabled: true, provider: config }
    });

    expect(calls).toBe(1);
    expect(result.steps[0].status).toBe('ok');
  });
});
