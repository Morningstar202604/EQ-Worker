import { SCHEMA_VERSION } from '../constants';
import { createEmptyState, normalizeSettings, sanitizeImport } from '../sanitize';
import type { AppState, Meta } from '../types';

export interface MigrationResult {
  state: AppState;
  from: number;
  to: number;
  warnings: string[];
  unsafe: boolean;
  backupRequired: boolean;
}

type Raw = Record<string, unknown>;

function isObj(x: unknown): x is Raw {
  return !!x && typeof x === 'object' && !Array.isArray(x);
}

function preservesInput(raw: unknown, clean: unknown, allowLegacyDate = false): boolean {
  if (Array.isArray(raw)) {
    return Array.isArray(clean) && raw.length === clean.length && raw.every((item, i) => preservesInput(item, clean[i], allowLegacyDate));
  }
  if (isObj(raw)) {
    return isObj(clean) && Object.keys(raw).every((key) => {
      if (!Object.prototype.hasOwnProperty.call(clean, key)) return false;
      const value = raw[key];
      if (allowLegacyDate && (key === 'birthday' || key === 'anniversary') && typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const date = new Date(`${value}T00:00:00Z`);
        if (Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value && clean[key] === value.slice(5)) return true;
      }
      return preservesInput(value, clean[key], allowLegacyDate);
    });
  }
  return raw === clean;
}

export function detectSchema(raw: unknown): number {
  if (!isObj(raw)) return 0;
  if (isObj(raw.meta) && typeof raw.meta.schema === 'number') return raw.meta.schema;
  if (typeof raw.schema === 'number') return raw.schema;
  return 0;
}

export function migrate(raw: unknown): MigrationResult {
  const warnings: string[] = [];
  const from = detectSchema(raw);
  const to = SCHEMA_VERSION;

  if (!isObj(raw)) {
    warnings.push('数据结构无法识别，已按空数据初始化');
    return { state: createEmptyState(), from, to, warnings, unsafe: true, backupRequired: false };
  }

  if (from > to) {
    warnings.push(`数据版本 v${from} 高于当前 v${to}，已按当前结构尽量兼容读取`);
  } else if (from > 0 && from < to) {
    warnings.push(`数据已从 v${from} 迁移到 v${to}`);
  } else if (from === 0) {
    warnings.push('数据缺少版本号，已按当前结构兼容读取');
  }

  const clean = sanitizeImport(raw);
  warnings.push(...clean.warn);

  const settings = normalizeSettings(clean.settings);
  const meta: Meta = { schema: to, updatedAt: Date.now() };

  const state: AppState = {
    persons: clean.persons,
    events: clean.events,
    reminders: clean.reminders,
    progress: clean.progress,
    streak: clean.streak,
    settings,
    meta,
    lastEventId: null,
    filter: '',
    identity: 'all',
    sortBy: 'heat',
    trainDiff: '全部',
    ledgerFilter: 'all'
  };

  const fields = ['persons', 'events', 'reminders', 'progress', 'streak', 'settings'] as const;
  const rawMeta = isObj(raw.meta) ? raw.meta : {};
  const legacy = from > 0 && from < to;
  const backupRequired = legacy && !preservesInput(raw.persons, state.persons);
  const invalidMeta = 'meta' in raw && (!isObj(raw.meta) ||
    ('schema' in rawMeta && (typeof rawMeta.schema !== 'number' || !Number.isInteger(rawMeta.schema) || rawMeta.schema < 0)) ||
    ('updatedAt' in rawMeta && (typeof rawMeta.updatedAt !== 'number' || !Number.isFinite(rawMeta.updatedAt))));
  const invalidSchema = 'schema' in raw && (typeof raw.schema !== 'number' || !Number.isInteger(raw.schema) || raw.schema < 0);
  const unsafe = invalidMeta || invalidSchema || from > to || (typeof raw.schema === 'number' && raw.schema > to) ||
    (typeof rawMeta.schema === 'number' && rawMeta.schema > to) ||
    Object.keys(raw).some((key) => !['schema', 'meta', ...fields].includes(key)) ||
    Object.keys(rawMeta).some((key) => key !== 'schema' && key !== 'updatedAt') ||
    fields.some((field) => field in raw && !preservesInput(raw[field], state[field], legacy && field === 'persons'));
  if (unsafe) warnings.push('数据版本不兼容或清洗会丢失原始数据，已启用写保护');
  return { state, from, to, warnings, unsafe, backupRequired };
}
