import { SCHEMA_VERSION } from '../constants';
import { createEmptyState, normalizeSettings, sanitizeImport } from '../sanitize';
import type { AppState, Meta } from '../types';

export interface MigrationResult {
  state: AppState;
  from: number;
  to: number;
  warnings: string[];
}

type Raw = Record<string, unknown>;

function isObj(x: unknown): x is Raw {
  return !!x && typeof x === 'object' && !Array.isArray(x);
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
    return { state: createEmptyState(), from, to, warnings };
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

  return { state, from, to, warnings };
}
