import type { AIProvider, AIRequest, AIResponse, ProviderConfig } from '../types';

export interface MockProviderOptions {
  responses?: string[];
  delayMs?: number;
  failWith?: Error;
  onRequest?: (request: AIRequest) => void;
  createResponse?: (request: AIRequest, callIndex: number) => string;
}

export interface MockProvider extends AIProvider {
  readonly calls: AIRequest[];
  enqueue(...responses: string[]): void;
}

export function createMockProvider(config: ProviderConfig, options: MockProviderOptions = {}): MockProvider {
  const queue = [...(options.responses ?? [])];
  const calls: AIRequest[] = [];
  let callIndex = 0;

  const provider: MockProvider = {
    id: config.id,
    label: config.label,
    kind: config.kind,
    calls,
    enqueue(...responses: string[]): void {
      queue.push(...responses);
    },
    async chat(request: AIRequest): Promise<AIResponse> {
      calls.push(request);
      options.onRequest?.(request);

      if (options.delayMs && options.delayMs > 0) {
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(resolve, options.delayMs);
          request.signal?.addEventListener(
            'abort',
            () => {
              clearTimeout(timer);
              reject(new DOMException('Aborted', 'AbortError'));
            },
            { once: true }
          );
        });
      }

      if (options.failWith) {
        throw options.failWith;
      }

      const current = callIndex;
      callIndex += 1;
      const text = options.createResponse
        ? options.createResponse(request, current)
        : queue.shift() ?? `mock response ${current + 1}`;

      return {
        text,
        model: config.model,
        providerId: config.id,
        usage: { inputTokens: 0, outputTokens: 0 }
      };
    }
  };

  return provider;
}
