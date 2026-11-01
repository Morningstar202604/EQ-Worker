import { describe, expect, it } from 'vitest';
import {
  defaultAISettings,
  parseAISettings,
  serializeAISettings,
  validateAISettings
} from '../src/index';

const API_KEY = 'sk-settings-must-not-be-serialized';

const provider = {
  id: 'deepseek',
  label: 'DeepSeek',
  kind: 'openai' as const,
  baseUrl: 'https://api.deepseek.com/v1',
  model: 'deepseek-chat',
  temperature: 0.4,
  maxTokens: 512
};

describe('AISettings', () => {
  it('defaults to disabled with preview before send', () => {
    const settings = defaultAISettings();

    expect(settings.enabled).toBe(false);
    expect(settings.provider).toBeNull();
    expect(settings.previewBeforeSend).toBe(true);
    expect(settings.contextPolicy.name).toBe(false);
    expect(settings.contextPolicy.birthday).toBe(false);
    expect(settings.contextPolicy.notes).toBe(false);
    expect(settings.contextPolicy.likes).toBe(false);
    expect(settings.contextPolicy.taboos).toBe(false);
    expect(settings.contextPolicy.events).toBe(true);
    expect(settings.memoryWindow).toBe(8);
  });

  it('accepts a valid provider config', () => {
    const result = validateAISettings({ enabled: true, provider });

    expect(result.ok).toBe(true);
    expect(result.settings.provider).toEqual(provider);
    expect(result.errors).toEqual([]);
  });

  it('rejects invalid providers and out-of-range windows', () => {
    const result = validateAISettings({
      enabled: true,
      provider: { ...provider, kind: 'grpc' },
      memoryWindow: 999,
      requestTimeoutMs: 10
    });

    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('provider.kind');
    expect(result.errors.join(' ')).toContain('memoryWindow');
    expect(result.errors.join(' ')).toContain('requestTimeoutMs');
  });

  it('serializes without any api key material', () => {
    const settings = validateAISettings({ enabled: true, provider }).settings;
    const raw = serializeAISettings(settings);

    expect(raw).not.toContain(API_KEY);
    expect(raw).not.toContain('apiKey');
    expect(raw).not.toContain('authorization');
    expect(JSON.parse(raw)).toMatchObject({ enabled: true, previewBeforeSend: true });
  });

  it('drops unknown secret fields on the ground', () => {
    const settings = validateAISettings({
      enabled: true,
      provider: { ...provider, apiKey: API_KEY },
      apiKey: API_KEY
    }).settings;
    const raw = serializeAISettings(settings);

    expect(raw).not.toContain(API_KEY);
  });

  it('falls back to defaults on corrupted storage', () => {
    const parsed = parseAISettings('{not json');

    expect(parsed.ok).toBe(false);
    expect(parsed.restored).toBe(false);
    expect(parsed.settings.enabled).toBe(false);
    expect(parsed.settings.provider).toBeNull();
  });

  it('round-trips a valid serialized payload', () => {
    const settings = validateAISettings({ enabled: true, provider }).settings;
    const parsed = parseAISettings(serializeAISettings(settings));

    expect(parsed.ok).toBe(true);
    expect(parsed.restored).toBe(true);
    expect(parsed.settings).toStrictEqual(settings);
    expect(JSON.parse(serializeAISettings(parsed.settings))).toStrictEqual(JSON.parse(serializeAISettings(settings)));
  });

  it('does not mutate the default object between calls', () => {
    const first = defaultAISettings();
    first.enabled = true;
    first.contextPolicy.name = true;

    const second = defaultAISettings();
    expect(second.enabled).toBe(false);
    expect(second.contextPolicy.name).toBe(false);
  });
});
