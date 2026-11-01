export interface StorageAdapter {
  getItem(k: string): string | null;
  setItem(k: string, v: string): boolean;
  removeItem(k: string): void;
}

export interface MemoryAdapter extends StorageAdapter {
  readonly kind: 'memory';
  keys(): string[];
}

export function createMemoryAdapter(seed: Record<string, string> = {}): MemoryAdapter {
  const mem = new Map<string, string>(Object.entries(seed));
  return {
    kind: 'memory',
    getItem(k: string): string | null {
      return mem.has(k) ? (mem.get(k) as string) : null;
    },
    setItem(k: string, v: string): boolean {
      mem.set(k, String(v));
      return true;
    },
    removeItem(k: string): void {
      mem.delete(k);
    },
    keys(): string[] {
      return Array.from(mem.keys());
    }
  };
}
