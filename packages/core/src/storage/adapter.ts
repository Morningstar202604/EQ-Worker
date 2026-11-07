export interface StorageAdapter {
  getItem(k: string): string | null;
  setItem(k: string, v: string): boolean;
  removeItem(k: string): void;
  /** 读取阶段发生不可恢复错误时置 true，让调用方区分「空数据」与「读不出来」。 */
  readonly degraded?: boolean;
  /** 最近一次读取失败的原因，用于向用户如实报告。 */
  readonly loadError?: string;
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
