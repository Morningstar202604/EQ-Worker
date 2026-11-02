import { createMemoryAdapter, type StorageAdapter } from './adapter';

export interface LocalAdapterOptions {
  keyPrefix?: string;
  storage?: StorageLike | null;
}

export interface StorageLike {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

export interface LocalAdapter extends StorageAdapter {
  readonly kind: 'local';
  readonly degraded: boolean;
}

export function createLocalAdapter(options: LocalAdapterOptions = {}): LocalAdapter {
  const prefix = options.keyPrefix || '';
  const fallback = createMemoryAdapter();
  const pending = new Set<string>();
  let storage: StorageLike | null = options.storage ?? null;
  let degraded = false;
  if (storage === null) {
    try {
      if (typeof localStorage !== 'undefined') storage = localStorage;
    } catch {
      degraded = true;
    }
  }

  const k = (key: string) => prefix + key;

  return {
    kind: 'local',
    get degraded() {
      return degraded;
    },
    getItem(key: string): string | null {
      if (pending.has(key)) return fallback.getItem(k(key));
      if (storage) {
        try {
          const v = storage.getItem(k(key));
          if (v !== null && v !== undefined) return v;
        } catch (e) {
          degraded = true;
        }
      }
      return fallback.getItem(k(key));
    },
    setItem(key: string, v: string): boolean {
      fallback.setItem(k(key), v);
      if (storage) {
        try {
          storage.setItem(k(key), v);
          pending.delete(key);
          return true;
        } catch (e) {
          degraded = true;
          pending.add(key);
          return false;
        }
      }
      degraded = true;
      pending.add(key);
      return false;
    },
    removeItem(key: string): void {
      fallback.removeItem(k(key));
      if (storage) {
        try {
          storage.removeItem(k(key));
          pending.delete(key);
        } catch (e) {
          degraded = true;
          pending.add(key);
        }
      } else {
        pending.add(key);
      }
    }
  };
}
