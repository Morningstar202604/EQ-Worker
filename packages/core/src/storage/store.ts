import { AI_KEY, DB_KEY, DEFAULT_AI, LEGACY_DB_KEYS, SCHEMA_VERSION } from '../constants';
import { createEmptyState, normalizeSettings, sanitizeImport } from '../sanitize';
import type { AppState, SanitizeResult } from '../types';
import type { StorageAdapter } from './adapter';
import { migrate } from './migrate';

export interface ExportPayload {
  app: string;
  version: number;
  schema: number;
  exportedAt: number;
  persons: AppState['persons'];
  events: AppState['events'];
  reminders: AppState['reminders'];
  progress: AppState['progress'];
  streak: AppState['streak'];
  settings: AppState['settings'];
  meta: AppState['meta'];
}

export interface ImportResult {
  applied: boolean;
  clean: SanitizeResult;
  warnings: string[];
}

export interface Store {
  getState(): AppState;
  /** 用外部构造的新状态替换内存状态（纯函数式更新后必须调用，否则 save() 仍写旧状态）。 */
  setState(next: AppState): void;
  isWriteProtected(): boolean;
  load(): boolean;
  save(): boolean;
  export(): ExportPayload;
  exportJSON(): string;
  importObjects(raw: unknown): ImportResult;
  applyImport(clean: SanitizeResult): boolean;
  setAIKey(key: string): boolean;
  getAIKey(): string | null;
  clearAIKey(): void;
  reset(): AppState;
}

export function createStore(adapter: StorageAdapter): Store {
  let state: AppState = createEmptyState();
  let writeProtected = false;

  const store: Store = {
    setState(next: AppState) {
      state = next;
    },

    getState() {
      return state;
    },

    isWriteProtected() {
      return writeProtected;
    },

    load(): boolean {
      try {
        let raw = adapter.getItem(DB_KEY);
        let fromLegacyKey = false;
        if (raw === null) {
          for (const k of LEGACY_DB_KEYS) {
            const old = adapter.getItem(k);
            if (old !== null) {
              raw = old;
              fromLegacyKey = true;
              break;
            }
          }
        }
        if ('degraded' in adapter && adapter.degraded) writeProtected = true;
        if (raw === null) return false;
        const parsed: unknown = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as Record<string, unknown>).persons)) {
          writeProtected = true;
          return false;
        }
        const migrated = migrate(parsed);
        state = migrated.state;
        if (migrated.unsafe) writeProtected = true;
        if (!writeProtected && migrated.backupRequired) {
          const backupKey = `${DB_KEY}_migration_backup`;
          const existing = adapter.getItem(backupKey);
          /* 只要已经有一份备份就算保全，不要求它等于「当前这次」的原文。
             否则：第一次迁移写入原文备份 → 规范化后的数据落盘 → 重启时
             备份键里是更早的原文、与当前 raw 不同 → 判冲突 → 永久写保护。
             那会让每一次成功的迁移都在下一次启动时锁死用户。 */
          if ('degraded' in adapter && adapter.degraded) {
            writeProtected = true;
          } else if (existing === null) {
            if (!adapter.setItem(backupKey, raw) || adapter.getItem(backupKey) !== raw) writeProtected = true;
          } else if (existing !== raw) {
            /* 备份键里已有更早一次迁移的原文，绝不能覆盖它。
               但也不能因此把用户锁死：把当前这份原文另存为一个独立键，
               两份原始数据都保全，主库照常可写。 */
            const altKey = `${backupKey}_${Date.now()}`;
            if (!adapter.setItem(altKey, raw) || adapter.getItem(altKey) !== raw) writeProtected = true;
          }
        }
        if (!writeProtected && (fromLegacyKey || migrated.from !== SCHEMA_VERSION)) store.save();
        return true;
      } catch (e) {
        writeProtected = true;
        return false;
      }
    },

    save(): boolean {
      if (writeProtected) return false;
      try {
        const updatedAt = Date.now();
        state.meta = { schema: SCHEMA_VERSION, updatedAt };
        const body = {
          schema: SCHEMA_VERSION,
          meta: state.meta,
          persons: state.persons,
          events: state.events,
          reminders: state.reminders,
          progress: state.progress,
          streak: state.streak,
          settings: state.settings
        };
        /* 写盘前用读盘同一套规则规范化，保证"写出去的就是下次能原样读回的"。
           不做这一步时，任何入口写入非规范值（金额配 dir:none、标签超 10 个、
           note 超长、全日期生日、冲突正权重）都会在下一次 load 时被清洗，
           进而被判成数据丢失、进入永久写保护——用户表现为"昨天能用今天改不动"。
           规范化不得改变条目数量：若数量变了说明是真丢数据，宁可拒写也不静默丢弃。 */
        const normalized = sanitizeImport(body);
        if (normalized.persons.length !== state.persons.length ||
            normalized.events.length !== state.events.length ||
            normalized.reminders.length !== state.reminders.length) {
          return false;
        }
        /* 金额被 clamp、文本被截断同样是「用户看到的和存下来的不一致」，
           这类变化不改变条目数，只看条数会静默改数
           （例如 99,999,999 被存成 10,000,000），界面却报成功。
           这里只拦「会被改坏语义」的两类：金额越界、关键文本超长。 */
        for (let i = 0; i < state.events.length; i++) {
          const before = state.events[i];
          const after = normalized.events[i];
          if (!after) return false;
          // undefined 与 0 等价（调用方可能没写 amount 字段）
          if ((Number(before.amount) || 0) !== (Number(after.amount) || 0)) return false;
          if (String(before.title ?? '').length > 80) return false;
          if (String(before.note ?? '').length > 500) return false;
        }
        for (let i = 0; i < state.persons.length; i++) {
          const before = state.persons[i];
          const after = normalized.persons[i];
          if (!after) return false;
          if (String(before.name ?? '').length > 60) return false;
          if (String(before.note ?? '').length > 500) return false;
          if (Array.isArray(before.tags) && before.tags.length > 10) return false;
        }
        const payload = {
          schema: SCHEMA_VERSION,
          meta: state.meta,
          persons: normalized.persons,
          events: normalized.events,
          reminders: normalized.reminders,
          progress: normalized.progress,
          streak: normalized.streak,
          settings: normalized.settings
        };
        if (!adapter.setItem(DB_KEY, JSON.stringify(payload))) return false;
        /* 内存与磁盘必须完全一致：只回写三个数组会让 progress/streak/settings
           继续保留非规范值。实例：streak.n 为字符串 '7' 时，recordPractice 里
           `sk.n + 1` 会拼成 '71'，而这个值只存在于当前会话。 */
        state.persons = normalized.persons;
        state.events = normalized.events;
        state.reminders = normalized.reminders;
        state.progress = normalized.progress;
        state.streak = normalized.streak;
        state.settings = normalized.settings;
        return true;
      } catch (e) {
        return false;
      }
    },

    export(): ExportPayload {
      return {
        app: 'EQ-Worker',
        version: 3,
        schema: SCHEMA_VERSION,
        exportedAt: Date.now(),
        persons: state.persons,
        events: state.events,
        reminders: state.reminders,
        progress: state.progress,
        streak: state.streak,
        settings: { ...state.settings, ai: { ...DEFAULT_AI } },
        meta: state.meta
      };
    },

    exportJSON(): string {
      return JSON.stringify(store.export(), null, 2);
    },

    importObjects(raw: unknown): ImportResult {
      const warnings: string[] = [];
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        warnings.push('导入失败：文件格式不对');
        return {
          applied: false,
          clean: sanitizeImport({}),
          warnings
        };
      }
      const obj = raw as Record<string, unknown>;
      if (!Array.isArray(obj.persons)) {
        warnings.push('导入失败：文件格式不对（缺少 persons）');
        return { applied: false, clean: sanitizeImport({}), warnings };
      }
      const clean = sanitizeImport(obj);
      // 清洗警告要交给调用方：条数被判掉、生日格式非法等都发生在这一步，
      // 之前吞掉它们，用户只看到"导入成功"。
      warnings.push(...clean.warn);
      /* 空导入必须拒绝。sanitizeImport 会丢弃没有名字的联系人，
         所以一份全是无效联系人的备份清洗后就是 0 条——若照单全收，
         等同用空数据覆盖用户现有账本，而且是静默的。 */
      if (clean.persons.length === 0) {
        warnings.push('导入失败：没有可用的联系人，已保留现有数据');
        return { applied: false, clean, warnings };
      }
      /* 备份恢复是最后一道数据兜底，金额被 clamp 就等于把备份改坏。
         检测原始值与清洗值的差异，超限一律拒绝，而不是静默存成上限。 */
      const rawEvents = (obj.events as Array<Record<string, unknown>>) || [];
      for (let i = 0; i < rawEvents.length; i++) {
        const rawAmount = Number(rawEvents[i]?.amount ?? 0);
        const cleanAmount = Number(clean.events[i]?.amount ?? 0);
        if (Number.isFinite(rawAmount) && rawAmount > 0 && rawAmount !== cleanAmount) {
          warnings.push(`导入失败：第 ${i + 1} 条往来金额 ${rawAmount} 超出允许范围（上限 1000 万），已保留现有数据`);
          return { applied: false, clean, warnings };
        }
      }
      const applied = store.applyImport(clean);
      if (!applied) warnings.push('导入失败：写入本机存储失败，现有数据未改动');
      return { applied, clean, warnings };
    },

    /** 返回是否真正落盘。先写入成功再替换内存，失败时保持原状态。 */
    applyImport(clean: SanitizeResult): boolean {
      const prev = state;
      const next: AppState = {
        ...state,
        persons: clean.persons,
        events: clean.events,
        reminders: clean.reminders,
        progress: clean.progress,
        streak: clean.streak,
        settings: normalizeSettings(clean.settings),
        meta: { schema: SCHEMA_VERSION, updatedAt: Date.now() },
        lastEventId: null,
        filter: '',
        identity: 'all',
        sortBy: 'heat',
        trainDiff: '全部'
      };
      state = next;
      if (store.save()) return true;
      // 落盘失败：回滚内存，否则界面显示新数据、刷新后全丢。
      state = prev;
      return false;
    },

    setAIKey(key: string): boolean {
      return adapter.setItem(AI_KEY, String(key));
    },

    getAIKey(): string | null {
      return adapter.getItem(AI_KEY);
    },

    clearAIKey(): void {
      adapter.removeItem(AI_KEY);
    },

    reset(): AppState {
      state = createEmptyState();
      return state;
    }
  };

  return store;
}
