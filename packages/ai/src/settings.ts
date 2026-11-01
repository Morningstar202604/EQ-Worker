import { DEFAULT_CONTEXT_POLICY, scrubSecrets } from './context';
import type { ContextPolicy, ProviderConfig, ProviderKind } from './types';

export interface AISettings {
  enabled: boolean;
  provider: ProviderConfig | null;
  contextPolicy: ContextPolicy;
  memoryWindow: number;
  requestTimeoutMs: number;
  previewBeforeSend: boolean;
}

export interface SettingsValidation {
  ok: boolean;
  settings: AISettings;
  errors: string[];
}

export interface SettingsParseResult extends SettingsValidation {
  restored: boolean;
}

const PROVIDER_KINDS: readonly ProviderKind[] = ['openai', 'anthropic', 'custom'];
const MAX_MEMORY_WINDOW = 50;
const MIN_TIMEOUT_MS = 1000;
const MAX_TIMEOUT_MS = 120_000;

export function defaultAISettings(): AISettings {
  return {
    enabled: false,
    provider: null,
    contextPolicy: { ...DEFAULT_CONTEXT_POLICY },
    memoryWindow: 8,
    requestTimeoutMs: 20_000,
    previewBeforeSend: true
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function parseProvider(input: unknown, errors: string[]): ProviderConfig | null {
  if (input === null || input === undefined) {
    return null;
  }
  if (!isRecord(input)) {
    errors.push('provider must be an object or null');
    return null;
  }

  const id = asString(input.id).trim();
  const label = asString(input.label).trim();
  const kind = asString(input.kind) as ProviderKind;
  const baseUrl = asString(input.baseUrl).trim();
  const model = asString(input.model).trim();

  if (!id) {
    errors.push('provider.id is required');
  }
  if (!label) {
    errors.push('provider.label is required');
  }
  if (!PROVIDER_KINDS.includes(kind)) {
    errors.push(`provider.kind must be one of ${PROVIDER_KINDS.join(', ')}`);
  }
  if (!baseUrl) {
    errors.push('provider.baseUrl is required');
  }
  if (!model) {
    errors.push('provider.model is required');
  }

  if (!id || !label || !PROVIDER_KINDS.includes(kind) || !baseUrl || !model) {
    return null;
  }

  const provider: ProviderConfig = { id, label, kind, baseUrl, model };
  if (typeof input.temperature === 'number' && Number.isFinite(input.temperature)) {
    provider.temperature = Math.min(2, Math.max(0, input.temperature));
  }
  if (typeof input.maxTokens === 'number' && Number.isFinite(input.maxTokens) && input.maxTokens > 0) {
    provider.maxTokens = Math.floor(input.maxTokens);
  }
  return provider;
}

function parsePolicy(input: unknown, errors: string[]): ContextPolicy {
  if (input === undefined || input === null) {
    return { ...DEFAULT_CONTEXT_POLICY };
  }
  if (!isRecord(input)) {
    errors.push('contextPolicy must be an object');
    return { ...DEFAULT_CONTEXT_POLICY };
  }

  const policy: ContextPolicy = { ...DEFAULT_CONTEXT_POLICY };
  for (const key of Object.keys(policy) as (keyof ContextPolicy)[]) {
    const value = input[key];
    if (value === undefined) {
      continue;
    }
    if (typeof value !== 'boolean') {
      errors.push(`contextPolicy.${key} must be a boolean`);
      continue;
    }
    policy[key] = value;
  }
  return policy;
}

export function validateAISettings(input: unknown): SettingsValidation {
  const errors: string[] = [];
  if (!isRecord(input)) {
    return {
      ok: false,
      settings: defaultAISettings(),
      errors: ['settings must be an object']
    };
  }

  const provider = parseProvider(input.provider, errors);
  const memoryWindowRaw = asNumber(input.memoryWindow, 8);
  const timeoutRaw = asNumber(input.requestTimeoutMs, 20_000);

  if (memoryWindowRaw < 1 || memoryWindowRaw > MAX_MEMORY_WINDOW) {
    errors.push(`memoryWindow must be between 1 and ${MAX_MEMORY_WINDOW}`);
  }
  if (timeoutRaw < MIN_TIMEOUT_MS || timeoutRaw > MAX_TIMEOUT_MS) {
    errors.push(`requestTimeoutMs must be between ${MIN_TIMEOUT_MS} and ${MAX_TIMEOUT_MS}`);
  }

  const settings: AISettings = {
    enabled: asBoolean(input.enabled, false),
    provider,
    contextPolicy: parsePolicy(input.contextPolicy, errors),
    memoryWindow: Math.min(MAX_MEMORY_WINDOW, Math.max(1, Math.floor(memoryWindowRaw))),
    requestTimeoutMs: Math.min(MAX_TIMEOUT_MS, Math.max(MIN_TIMEOUT_MS, Math.floor(timeoutRaw))),
    previewBeforeSend: asBoolean(input.previewBeforeSend, true)
  };

  return { ok: errors.length === 0, settings, errors };
}

export function serializeAISettings(settings: AISettings): string {
  const safe: AISettings = {
    enabled: settings.enabled,
    provider: settings.provider
      ? {
          id: settings.provider.id,
          label: settings.provider.label,
          kind: settings.provider.kind,
          baseUrl: settings.provider.baseUrl,
          model: settings.provider.model,
          ...(settings.provider.temperature === undefined ? {} : { temperature: settings.provider.temperature }),
          ...(settings.provider.maxTokens === undefined ? {} : { maxTokens: settings.provider.maxTokens })
        }
      : null,
    contextPolicy: { ...settings.contextPolicy },
    memoryWindow: settings.memoryWindow,
    requestTimeoutMs: settings.requestTimeoutMs,
    previewBeforeSend: settings.previewBeforeSend
  };
  return JSON.stringify(scrubSecrets(safe));
}

export function parseAISettings(raw: string | null | undefined): SettingsParseResult {
  if (!raw) {
    return { ok: true, restored: false, settings: defaultAISettings(), errors: [] };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, restored: false, settings: defaultAISettings(), errors: ['settings JSON is invalid'] };
  }
  const result = validateAISettings(parsed);
  return { ...result, restored: result.ok };
}
