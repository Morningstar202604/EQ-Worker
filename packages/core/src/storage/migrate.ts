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

/* 旧版本写入过、当前模型不再保留的字段。
   清洗时丢弃它们是正确的，但 preservesInput 会把"字段没了"当成数据丢失，
   进而触发永久写保护——用户能看到数据却再也存不进去。这里显式豁免。 */
const LEGACY_DROPPED_FIELDS = new Set([
  'updatedAt',
  'lastContact',
  'avatar',
  'pinned',
  'group',
  'source',
  'importedAt'
]);

function isObj(x: unknown): x is Raw {
  return !!x && typeof x === 'object' && !Array.isArray(x);
}

/* 有损但安全的规范化：文本超长被截断、非法日期被清空。
   这类变化不会让用户丢条目，只是把值收敛到模型允许的范围。
   以前它们和「整条记录丢失」被同等对待，结果旧库只要有一条 600 字备注
   就永久写保护——用户看得见数据却一个字改不了。 */
const TRUNCATABLE_KEYS = new Set(['name', 'note', 'title', 'likes', 'taboos', 'content', 'identity', 'occasion']);

function isSafeTruncation(key: string, raw: unknown, clean: unknown): boolean {
  if (typeof raw !== 'string' || typeof clean !== 'string') return false;
  // 超长被截断：clean 是 raw 的前缀
  if (raw.length > clean.length && raw.startsWith(clean)) return TRUNCATABLE_KEYS.has(key) || clean.length > 0;
  // 非法日期被清空
  if (clean === '' && (key === 'birthday' || key === 'anniversary')) return true;
  return false;
}

/* 严格比较：任何差异都算「有改动」，用于决定迁移前是否必须备份。
   与 preservesInput 的区别是它不容忍截断/清空。 */
function preservesInputStrict(raw: unknown, clean: unknown): boolean {
  if (Array.isArray(raw)) {
    return Array.isArray(clean) && raw.length === clean.length && raw.every((item, i) => preservesInputStrict(item, clean[i]));
  }
  if (isObj(raw)) {
    return isObj(clean) && Object.keys(raw).every((key) => {
      if (!Object.prototype.hasOwnProperty.call(clean, key)) return false;
      return preservesInputStrict(raw[key], clean[key]);
    });
  }
  return raw === clean;
}

/* 与 sanitize.mmdd 同一判定：合法 MM-DD 或 YYYY-MM-DD 才算有效日期。 */
function isValidMMDD(v: string): boolean {
  const m = v.match(/^(?:\d{4}-)?(\d{2})-(\d{2})$/);
  if (!m) return false;
  const month = Number(m[1]);
  const day = Number(m[2]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const probe = new Date(2000, month - 1, day);
  return probe.getMonth() === month - 1 && probe.getDate() === day;
}

function preservesInput(raw: unknown, clean: unknown, allowLegacyDate = false): boolean {
  if (Array.isArray(raw)) {
    if (!Array.isArray(clean) || raw.length !== clean.length) return false;
    // 数组元素允许列表类字段被裁剪（tags 12 → 10），只要条目数不变
    return raw.every((item, i) => preservesInput(item, clean[i], allowLegacyDate));
  }
  if (isObj(raw)) {
    return isObj(clean) && Object.keys(raw).every((key) => {
      if (LEGACY_DROPPED_FIELDS.has(key)) return true;
      if (key === 'tags' && Array.isArray(raw[key]) && Array.isArray(clean[key])) {
        // 标签裁剪是已知的安全规范化，不算丢数据
        return true;
      }
      if (!Object.prototype.hasOwnProperty.call(clean, key)) return false;
      const value = raw[key];
      if (isSafeTruncation(key, value, clean[key])) return true;
      /* 缺失的 dir 字段被补齐为 none 是旧数据的已知形态（meal/talk 等本就不涉及金额）。 */
      if (key === 'dir' && (value === undefined || value === null) && clean[key] === 'none') return true;
      /* 非法生日（如 1990-02-30）会被清空为 ''。这是已知的安全规范化：
         保留一个不存在的日期只会让提醒系统每天报错，清空才是正确行为。 */
      if ((key === 'birthday' || key === 'anniversary') && typeof value === 'string'
        && value !== '' && clean[key] === '' && !isValidMMDD(value)) return true;
      /* 全日期生日是旧版表单写入的格式，任何 schema 下都是已知的、可安全折叠成 MM-DD 的值。
         以前只在「旧 schema 迁移」时放行，导致同一条数据在 schema 已是 5 时被判丢失、永久写保护。 */
      if ((key === 'birthday' || key === 'anniversary') && typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const date = new Date(`${value}T00:00:00Z`);
        if (Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value && clean[key] === value.slice(5)) return true;
      }
      return preservesInput(value, clean[key], allowLegacyDate);
    });
  }
  // 数值被 clamp（金额上限、权重范围）属于安全规范化
  if (typeof raw === 'number' && typeof clean === 'number') return true;
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
  /* 备份判断必须用「严格」比较，且不限旧 schema：
     只要加载会让任何值被改写（截断、clamp、日期清空），就先把原文备份下来。
     安全截断只用于决定「是否进入写保护」——不能让用户因为一条超长备注
     就永久改不动，也不能不留底就静默截断。 */
  const backupRequired = !preservesInputStrict(raw, state) && (
    'persons' in raw || 'events' in raw || 'reminders' in raw);
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
