import { describe, expect, it } from 'vitest';
import {
  AIErrorException,
  buildPersonContext,
  builtinPipeline,
  createMockProvider,
  runPipeline,
  type PipelineContext,
  type PipelineSettings,
  type PipelineStep
} from '../src/index';

const enabled: PipelineSettings = { enabled: true, requestTimeoutMs: 1000, previewBeforeSend: false };

function makeContext(overrides: Partial<PipelineContext> = {}): PipelineContext {
  return {
    person: { id: 'p-1', name: '李四', identity: '老同学' },
    context: buildPersonContext({ id: 'p-1', name: '李四', identity: '老同学' }),
    input: { occasion: '婚礼', text: '老同学下月结婚' },
    outputs: {},
    ...overrides
  };
}

const sceneJson = JSON.stringify({ sceneId: 'wedding', confidence: 0.9 });
const scriptJson = JSON.stringify({
  variants: { stable: '稳妥话术', close: '亲近话术', brief: '简短话术' }
});
const giftJson = JSON.stringify({ low: 600, mid: 800, high: 1000, reasons: ['关系为老同学', '婚礼行情'] });
const reviewJson = JSON.stringify({ tips: ['婚后一周内回访', '下次见面补一句祝福', '避免只转账不说话'] });

function fullProvider() {
  return createMockProvider(
    { id: 'mock', label: 'Mock', kind: 'custom', baseUrl: 'http://mock.local', model: 'mock-1' },
    { responses: [sceneJson, scriptJson, giftJson, reviewJson] }
  );
}

describe('runPipeline with the builtin four steps', () => {
  it('runs scene_detect → script_generate → gift_advice → review end to end', async () => {
    const provider = fullProvider();
    const result = await runPipeline(builtinPipeline.steps, makeContext(), {
      provider,
      settings: enabled
    });

    expect(result.ok).toBe(true);
    expect(result.degraded).toBe(false);
    expect(result.steps.map((step) => step.id)).toEqual([
      'scene_detect',
      'script_generate',
      'gift_advice',
      'review'
    ]);
    expect(result.steps.every((step) => step.status === 'ok')).toBe(true);

    const output = result.output as {
      scene_detect: { sceneId: string };
      script_generate: { sceneId: string; variants: { toneId: string; text: string }[] };
      gift_advice: { low: number; mid: number; high: number; currency: string };
      review: { tips: string[] };
    };

    expect(output.scene_detect.sceneId).toBe('wedding');
    expect(output.script_generate.sceneId).toBe('wedding');
    expect(output.script_generate.variants.map((variant) => variant.toneId)).toEqual([
      'stable',
      'close',
      'brief'
    ]);
    expect(output.script_generate.variants.map((variant) => variant.text)).toEqual([
      '稳妥话术',
      '亲近话术',
      '简短话术'
    ]);
    expect(output.gift_advice).toMatchObject({ low: 600, mid: 800, high: 1000, currency: 'CNY' });
    expect(output.review.tips).toHaveLength(3);
    expect(provider.calls).toHaveLength(4);
  });

  it('accepts a PipelineDefinition directly', async () => {
    const result = await runPipeline(builtinPipeline, makeContext(), {
      provider: fullProvider(),
      settings: enabled
    });

    expect(result.ok).toBe(true);
    expect(result.steps).toHaveLength(4);
  });

  it('records a skipped optional step and keeps going', async () => {
    const steps: PipelineStep[] = [
      { id: 'first', run: () => 'first-output' },
      {
        id: 'optional',
        optional: true,
        run: () => {
          throw new AIErrorException({ code: 'bad_request', message: 'optional failed' });
        }
      },
      { id: 'third', run: (ctx) => `after:${String(ctx.outputs.first)}` }
    ];

    const result = await runPipeline(steps, makeContext(), { settings: enabled });

    expect(result.ok).toBe(true);
    expect(result.degraded).toBe(false);
    expect(result.steps.map((step) => step.status)).toEqual(['ok', 'skipped', 'ok']);
    expect(result.steps[1].error?.code).toBe('bad_request');
    expect(result.steps[2].output).toBe('after:first-output');
  });

  it('treats a timed out optional step as skipped and continues', async () => {
    const steps: PipelineStep[] = [
      {
        id: 'slow',
        optional: true,
        timeoutMs: 5,
        run: () => new Promise<string>((resolve) => setTimeout(() => resolve('late'), 50))
      },
      { id: 'fast', run: () => 'done' }
    ];

    const result = await runPipeline(steps, makeContext(), { settings: enabled });

    expect(result.ok).toBe(true);
    expect(result.steps.map((step) => step.status)).toEqual(['skipped', 'ok']);
    expect(result.steps[0].error?.code).toBe('timeout');
  });

  it('degrades to the fallback when a required step fails', async () => {
    const fallbackCalls: string[] = [];
    const steps: PipelineStep[] = [
      { id: 'ok-step', run: () => 'ok' },
      {
        id: 'required',
        run: () => {
          throw new AIErrorException({ code: 'server', message: 'model exploded' });
        }
      },
      { id: 'never', run: () => 'never' }
    ];

    const result = await runPipeline(steps, makeContext(), {
      settings: enabled,
      fallback: (ctx, cause) => {
        fallbackCalls.push(cause.code);
        return { source: 'rule', text: `本地规则：${String(ctx.outputs['ok-step'])}` };
      }
    });

    expect(result.ok).toBe(false);
    expect(result.degraded).toBe(true);
    expect(result.reason).toBe('failed');
    expect(result.error?.code).toBe('server');
    expect(fallbackCalls).toEqual(['server']);
    expect(result.output).toEqual({ source: 'rule', text: '本地规则：ok' });
    expect(result.steps.map((step) => step.status)).toEqual(['ok', 'failed']);
  });

  it('degrades with a rule-based fallback when the model returns broken JSON', async () => {
    const provider = createMockProvider(
      { id: 'mock', label: 'Mock', kind: 'custom', baseUrl: 'http://mock.local', model: 'mock-1' },
      { responses: ['not json at all', scriptJson, giftJson, reviewJson] }
    );

    const result = await runPipeline(builtinPipeline.steps, makeContext(), {
      provider,
      settings: enabled,
      fallback: () => ({ source: 'rule', script: { stable: '本地稳妥话术' } })
    });

    expect(result.ok).toBe(false);
    expect(result.degraded).toBe(true);
    expect(result.steps[0]).toMatchObject({ id: 'scene_detect', status: 'failed' });
    expect(result.steps[0].error?.code).toBe('invalid_response');
    expect(result.output).toEqual({ source: 'rule', script: { stable: '本地稳妥话术' } });
  });

  it('returns an empty step list and the preview when disabled', async () => {
    const result = await runPipeline(builtinPipeline.steps, makeContext(), {
      settings: { enabled: false }
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('disabled');
    expect(result.steps).toEqual([]);
    expect(result.preview?.fields).toContain('relation');
  });

  it('blocks on approval when preview approval is required', async () => {
    const result = await runPipeline(builtinPipeline.steps, makeContext({ approved: false }), {
      settings: enabled,
      requireApproval: true
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('approval_required');
    expect(result.preview).toBeDefined();
  });
});
