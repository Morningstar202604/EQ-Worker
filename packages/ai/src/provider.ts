import { AIErrorException } from './types';
import type { AIError, AIProvider, FetchLike, ProviderConfig, ProviderKind } from './types';
import { createAnthropicProvider } from './providers/anthropic';
import { createOpenAIProvider } from './providers/openai';

export interface CreateProviderDeps {
  fetchImpl?: FetchLike;
  apiKey?: string;
}

const REQUIRED_FIELDS: readonly (keyof ProviderConfig)[] = ['id', 'label', 'baseUrl', 'model'];

function assertConfig(config: ProviderConfig): void {
  for (const field of REQUIRED_FIELDS) {
    const value = config[field];
    if (typeof value !== 'string' || value.trim() === '') {
      throw new AIErrorException({ code: 'bad_request', message: `Provider config is missing ${String(field)}` });
    }
  }
  if (!config.baseUrl.startsWith('http://') && !config.baseUrl.startsWith('https://')) {
    throw new AIErrorException({ code: 'bad_request', message: 'Provider baseUrl must use http or https' });
  }
}

function resolveFetch(fetchImpl?: FetchLike): FetchLike {
  if (fetchImpl) {
    return fetchImpl;
  }
  if (typeof globalThis.fetch === 'function') {
    return globalThis.fetch.bind(globalThis) as FetchLike;
  }
  throw new AIErrorException({ code: 'unsupported', message: 'No fetch implementation is available' });
}

export function toAIError(error: unknown): AIError {
  if (error instanceof AIErrorException) {
    return { code: error.code, message: error.message, ...(error.status === undefined ? {} : { status: error.status }) };
  }
  if (error instanceof Error) {
    if (error.name === 'AbortError') {
      return { code: 'aborted', message: 'Request aborted' };
    }
    return { code: 'unknown', message: error.message };
  }
  return { code: 'unknown', message: 'Unknown provider error' };
}

export function createProvider(config: ProviderConfig, deps: CreateProviderDeps = {}): AIProvider {
  assertConfig(config);
  const apiKey = deps.apiKey ?? '';
  if (!apiKey.trim()) {
    throw new AIErrorException({ code: 'missing_key', message: 'API key is required for this provider' });
  }
  const fetchImpl = resolveFetch(deps.fetchImpl);

  const kind: ProviderKind = config.kind;
  if (kind === 'openai' || kind === 'custom') {
    return createOpenAIProvider(config, { fetchImpl, apiKey });
  }
  if (kind === 'anthropic') {
    return createAnthropicProvider(config, { fetchImpl, apiKey });
  }
  throw new AIErrorException({ code: 'unsupported', message: `Unsupported provider kind: ${String(kind)}` });
}
