import { buildAbortSignal, extractErrorMessage, joinUrl, mapStatus, providerError, scrubSecret } from './openai';
import type { AIProvider, AIRequest, AIResponse, ChatMessage, ProviderConfig } from '../types';

export interface AnthropicProviderDeps {
  fetchImpl: (input: string, init?: RequestInit) => Promise<Response>;
  apiKey: string;
}

const ANTHROPIC_VERSION = '2023-06-01';
const DEFAULT_MAX_TOKENS = 1024;

function messagesEndpoint(baseUrl: string): string {
  const normalized = baseUrl.replace(/\/+$/, '');
  if (/\/v1$/i.test(normalized)) {
    return `${normalized}/messages`;
  }
  return joinUrl(normalized, '/v1/messages');
}

function splitMessages(messages: ChatMessage[]): { system: string; messages: { role: 'user' | 'assistant'; content: string }[] } {
  const systemParts: string[] = [];
  const turns: { role: 'user' | 'assistant'; content: string }[] = [];

  for (const message of messages) {
    const content = message.content.trim();
    if (!content) {
      continue;
    }
    if (message.role === 'system') {
      systemParts.push(content);
      continue;
    }
    turns.push({ role: message.role, content });
  }

  if (turns.length === 0 || turns[0].role !== 'user') {
    turns.unshift({ role: 'user', content: '请根据以上上下文继续。' });
  }

  return { system: systemParts.join('\n\n'), messages: turns };
}

export function createAnthropicProvider(
  config: ProviderConfig,
  deps: AnthropicProviderDeps
): AIProvider {
  if (!deps.apiKey.trim()) {
    throw providerError('missing_key', 'API key is required for this provider');
  }
  const endpoint = messagesEndpoint(config.baseUrl);

  return {
    id: config.id,
    label: config.label,
    kind: config.kind,
    async chat(request: AIRequest): Promise<AIResponse> {
      const { system, messages } = splitMessages(request.messages);
      const maxTokens = request.maxTokens ?? config.maxTokens ?? DEFAULT_MAX_TOKENS;
      const temperature = request.temperature ?? config.temperature;

      const body: Record<string, unknown> = {
        model: config.model,
        max_tokens: maxTokens,
        messages
      };
      if (system) {
        body.system = system;
      }
      if (temperature !== undefined) {
        body.temperature = temperature;
      }

      let response: Response;
      const abort = buildAbortSignal(request.timeoutMs ?? 30_000, request.signal);
      try {
        response = await deps.fetchImpl(endpoint, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-api-key': deps.apiKey,
            'anthropic-version': ANTHROPIC_VERSION
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
      const blocks = Array.isArray(record.content) ? record.content : [];
      const text = blocks
        .map((block) => {
          if (typeof block === 'object' && block !== null) {
            const typed = block as Record<string, unknown>;
            return typed.type === 'text' && typeof typed.text === 'string' ? typed.text : '';
          }
          return '';
        })
        .join('');

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
                ...(typeof usage.input_tokens === 'number' ? { inputTokens: usage.input_tokens } : {}),
                ...(typeof usage.output_tokens === 'number' ? { outputTokens: usage.output_tokens } : {})
              }
            }
          : {})
      };
    }
  };
}
