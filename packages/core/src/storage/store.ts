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
  load(): boolean;
  save(): boolean;
  export(): ExportPayload;
  exportJSON(): string;
  importObjects(raw: unknown): ImportResult;
  applyImport(clean: SanitizeResult): void;
  setAIKey(key: string): boolean;
  getAIKey(): string | null;
  clearAIKey(): void;
  reset(): AppState;
}

export function createStore(adapter: StorageAdapter): Store {
  let state: AppState = createEmptyState();

  const store: Store = {
    getState() {
      return state;
    },

    load(): boolean {
      try {
        let raw = adapter.getItem(DB_KEY);
        let fromLegacyKey = false;
        if (!raw) {
          for (const k of LEGACY_DB_KEYS) {
            const old = adapter.getItem(k);
            if (old) {
              raw = old;
              fromLegacyKey = true;
              break;
            }
          }
        }
        if (!raw) return false;
        const parsed: unknown = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as Record<string, unknown>).persons)) {
          return false;
        }
        const migrated = migrate(parsed);
        state = migrated.state;
        if (fromLegacyKey || migrated.from !== SCHEMA_VERSION) store.save();
        return true;
      } catch (e) {
        return false;
      }
    },

    save(): boolean {
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
        return adapter.setItem(DB_KEY, JSON.stringify(body));
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
      store.applyImport(clean);
      return { applied: true, clean, warnings };
    },

    applyImport(clean: SanitizeResult): void {
      state = {
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
      store.save();
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
