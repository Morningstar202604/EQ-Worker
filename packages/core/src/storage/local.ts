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
  let storage: StorageLike | null = options.storage ?? null;
  if (storage === null && typeof localStorage !== 'undefined') {
    storage = localStorage;
  }
  let degraded = false;

  const k = (key: string) => prefix + key;

  return {
    kind: 'local',
    get degraded() {
      return degraded;
    },
    getItem(key: string): string | null {
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
          return true;
        } catch (e) {
          degraded = true;
          return false;
        }
      }
      degraded = true;
      return false;
    },
    removeItem(key: string): void {
      fallback.removeItem(k(key));
      if (storage) {
        try {
          storage.removeItem(k(key));
        } catch (e) {
          degraded = true;
        }
      }
    }
  };
}
