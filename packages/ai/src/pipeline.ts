import { redactPreview } from './context';
import { AIErrorException } from './types';
import type {
  AIError,
  PipelineContext,
  PipelineDeps,
  PipelineDefinition,
  PipelineResult,
  PipelineStep,
  PipelineStepResult
} from './types';
import { createProvider, toAIError } from './provider';

function clampTimeout(timeoutMs: number | undefined, fallback: number): number {
  if (typeof timeoutMs !== 'number' || !Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return fallback;
  }
  return Math.min(timeoutMs, fallback);
}

function withTimeout<T>(task: Promise<T>, timeoutMs: number, signal?: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const finish = (action: () => void): void => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      action();
    };

    const timer = setTimeout(() => {
      finish(() => reject(new AIErrorException({ code: 'timeout', message: `Step timed out after ${timeoutMs}ms` })));
    }, timeoutMs);

    const onAbort = (): void => {
      finish(() => reject(new AIErrorException({ code: 'aborted', message: 'Step aborted' })));
    };

    if (signal) {
      if (signal.aborted) {
        onAbort();
        return;
      }
      signal.addEventListener('abort', onAbort, { once: true });
    }

    task.then(
      (value) => finish(() => resolve(value)),
      (error: unknown) => finish(() => reject(error))
    );
  });
}

function isPipelineDefinition(value: readonly PipelineStep[] | PipelineDefinition): value is PipelineDefinition {
  return !Array.isArray(value) && 'steps' in value;
}

async function invokeFallback(deps: PipelineDeps, context: PipelineContext, cause: AIError): Promise<unknown> {
  const handler = deps.fallback;
  if (!handler) {
    return undefined;
  }
  if (typeof handler === 'function') {
    return handler(context, cause);
  }
  return handler.handle(context, cause);
}

export async function runPipeline(
  steps: readonly PipelineStep[] | PipelineDefinition,
  context: PipelineContext,
  deps: PipelineDeps = {}
): Promise<PipelineResult> {
  const definitionSteps: readonly PipelineStep[] = isPipelineDefinition(steps) ? steps.steps : steps;
  const settings = deps.settings ?? context.settings;
  const now = deps.now ?? (() => Date.now());
  const baseTimeout = settings?.requestTimeoutMs ?? 20_000;

  const preview = redactPreview({
    system: context.context.system,
    user: context.context.user,
    fields: context.context.fields,
    redactions: context.context.redactions
  });

  if (!settings || settings.enabled !== true) {
    return {
      ok: false,
      reason: 'disabled',
      steps: [],
      output: undefined,
      degraded: false,
      preview
    };
  }

  const approvalRequired = deps.requireApproval ?? settings.previewBeforeSend === true;
  if (approvalRequired && context.approved !== true) {
    return {
      ok: false,
      reason: 'approval_required',
      steps: [],
      output: undefined,
      degraded: false,
      preview
    };
  }

  let provider = deps.provider;
  let setupError: AIError | undefined;
  if (!provider && settings.provider) {
    if (!deps.apiKey || deps.apiKey.trim() === '') {
      setupError = { code: 'missing_key', message: 'API key is required for this provider' };
    } else {
      try {
        provider = createProvider(settings.provider, { fetchImpl: deps.fetchImpl, apiKey: deps.apiKey });
      } catch (error) {
        setupError = toAIError(error);
      }
    }
  }

  if (setupError) {
    const fallbackOutput = await invokeFallback(deps, { ...context, outputs: { ...context.outputs } }, setupError);
    return {
      ok: false,
      reason: 'failed',
      steps: [],
      output: fallbackOutput,
      degraded: true,
      error: setupError,
      preview
    };
  }
  const effectiveDeps: PipelineDeps = { ...deps, provider };

  const results: PipelineStepResult[] = [];
  let failed: AIError | undefined;
  let outputs: Record<string, unknown> = { ...context.outputs };

  for (const step of definitionSteps) {
    const startedAt = now();
    const stepContext: PipelineContext = { ...context, outputs };

    try {
      const output = await withTimeout(
        Promise.resolve(step.run(stepContext, effectiveDeps)),
        clampTimeout(step.timeoutMs, baseTimeout),
        deps.signal
      );
      outputs = { ...outputs, [step.id]: output };
      results.push({ id: step.id, status: 'ok', output, ms: Math.max(0, now() - startedAt) });
    } catch (error) {
      const normalized = toAIError(error);
      if (deps.signal?.aborted) {
        results.push({ id: step.id, status: 'failed', ms: Math.max(0, now() - startedAt), error: normalized });
        failed = normalized;
        break;
      }
      if (step.optional === true) {
        results.push({ id: step.id, status: 'skipped', ms: Math.max(0, now() - startedAt), error: normalized });
        continue;
      }
      results.push({ id: step.id, status: 'failed', ms: Math.max(0, now() - startedAt), error: normalized });
      failed = normalized;
      break;
    }
  }

  if (!failed) {
    return { ok: true, steps: results, output: outputs, degraded: false, preview };
  }

  const degradedContext: PipelineContext = { ...context, outputs };
  const fallbackOutput = await invokeFallback(effectiveDeps, degradedContext, failed);

  return {
    ok: false,
    reason: 'failed',
    steps: results,
    output: fallbackOutput ?? outputs,
    degraded: true,
    error: failed,
    preview
  };
}
