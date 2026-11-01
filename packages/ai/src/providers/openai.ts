import { maskSecrets } from '../context';
import { AIErrorException } from '../types';
import type { AIError, AIProvider, AIRequest, AIResponse, ChatMessage, ProviderConfig } from '../types';

export interface OpenAIProviderDeps {
  fetchImpl: (input: string, init?: RequestInit) => Promise<Response>;
  apiKey: string;
}

export function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, '')}${path}`;
}

export function providerError(
  code: AIError['code'],
  message: string,
  status?: number,
  secret?: string
): AIErrorException {
  return new AIErrorException({ code, message: scrubSecret(message, secret), status });
}

export function scrubSecret(text: string, secret?: string): string {
  const masked = maskSecrets(text);
  if (secret && secret.length >= 4) {
    return masked.split(secret).join('[REDACTED]');
  }
  return masked;
}

export function mapStatus(status: number): AIError['code'] {
  if (status === 400 || status === 422) return 'bad_request';
  if (status === 401 || status === 403) return 'auth';
  if (status === 404) return 'not_found';
  if (status === 429) return 'rate_limit';
  if (status >= 500) return 'server';
  return 'unknown';
}

export function extractErrorMessage(bodyText: string): string {
  if (!bodyText) return '';
  try {
    const parsed: unknown = JSON.parse(bodyText);
    if (typeof parsed === 'object' && parsed !== null) {
      const record = parsed as Record<string, unknown>;
      const error = record.error;
      if (typeof error === 'string') return error;
      if (typeof error === 'object' && error !== null) {
        const nested = (error as Record<string, unknown>).message;
        if (typeof nested === 'string') return nested;
      }
      const message = record.message;
      if (typeof message === 'string') return message;
    }
  } catch {
    return bodyText;
  }
  return '';
}

export function buildAbortSignal(timeoutMs: number, external?: AbortSignal): { signal: AbortSignal; dispose: () => void } {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error('timeout')), timeoutMs);
  const onAbort = (): void => controller.abort(external?.reason);
  if (external) {
    if (external.aborted) {
      controller.abort(external.reason);
    } else {
      external.addEventListener('abort', onAbort, { once: true });
    }
  }
  return {
    signal: controller.signal,
    dispose: () => {
      clearTimeout(timeout);
      external?.removeEventListener('abort', onAbort);
    }
  };
}

function normalizeMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages
    .filter((message) => message.content.trim().length > 0)
    .map((message) => ({ role: message.role, content: message.content }));
}

export function createOpenAIProvider(
  config: ProviderConfig,
  deps: OpenAIProviderDeps
): AIProvider {
  if (!deps.apiKey.trim()) {
    throw providerError('missing_key', 'API key is required for this provider');
  }
  const endpoint = joinUrl(config.baseUrl, '/chat/completions');

  return {
    id: config.id,
    label: config.label,
    kind: config.kind,
    async chat(request: AIRequest): Promise<AIResponse> {
      const temperature = request.temperature ?? config.temperature;
      const maxTokens = request.maxTokens ?? config.maxTokens;
      const body: Record<string, unknown> = {
        model: config.model,
        messages: normalizeMessages(request.messages),
        stream: false
      };
      if (temperature !== undefined) {
        body.temperature = temperature;
      }
      if (maxTokens !== undefined) {
        body.max_tokens = maxTokens;
      }

      let response: Response;
      const abort = buildAbortSignal(request.timeoutMs ?? 30_000, request.signal);
      try {
        response = await deps.fetchImpl(endpoint, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${deps.apiKey}`
          },
          body: JSON.stringify(body),
          signal: abort.signal
        });
      } catch {
        const aborted = abort.signal.aborted;
        const external = request.signal?.aborted === true;
        throw providerError(
          aborted ? (external ? 'aborted' : 'timeout') : 'network',
          aborted ? (external ? 'Request aborted' : 'Request timed out') : 'Network request failed',
          undefined,
          deps.apiKey
        );
      } finally {
        abort.dispose();
      }

      const rawText = await response.text();
      if (!response.ok) {
        const detail = scrubSecret(extractErrorMessage(rawText), deps.apiKey);
        throw providerError(
          mapStatus(response.status),
          `Provider request failed with status ${response.status}${detail ? `: ${detail}` : ''}`,
          response.status,
          deps.apiKey
        );
      }

      let payload: unknown;
      try {
        payload = JSON.parse(rawText);
      } catch {
        throw providerError('invalid_response', 'Provider returned invalid JSON');
      }

      const record = payload as Record<string, unknown>;
      const choices = record.choices;
      const first = Array.isArray(choices) ? (choices[0] as Record<string, unknown> | undefined) : undefined;
      const message = first?.message as Record<string, unknown> | undefined;
      const text = typeof message?.content === 'string' ? message.content : '';
      if (!text.trim()) {
        throw providerError('invalid_response', 'Provider returned an empty completion');
      }

      const usage = record.usage as Record<string, unknown> | undefined;
      return {
        text,
        model: typeof record.model === 'string' ? record.model : config.model,
        providerId: config.id,
        ...(usage
          ? {
              usage: {
                ...(typeof usage.prompt_tokens === 'number' ? { inputTokens: usage.prompt_tokens } : {}),
                ...(typeof usage.completion_tokens === 'number' ? { outputTokens: usage.completion_tokens } : {})
              }
            }
          : {})
      };
    }
  };
}
