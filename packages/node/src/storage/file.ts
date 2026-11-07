import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import type { StorageAdapter, Store } from '../../../core/src/index';
import { createStore } from '../../../core/src/index';

/**
 * 文件存储适配器：把整个键值空间存进一个 JSON 文件。
 *
 * 设计要点：
 * - **原子写**：先写 .tmp 再 rename。断电或崩溃时要么是旧文件、要么是新文件，
 *   不会出现写了一半的损坏文件（localStorage 由浏览器保证，文件系统没有）。
 * - **首次读失败不吞掉**：文件存在但解析失败时抛错，交由调用方进入写保护，
 *   而不是当成空数据覆盖——这是保数据的底线。
 * - 与 core 的 StorageAdapter 同接口，因此 Store 的全部逻辑（迁移、导入导出、
 *   写保护）在 CLI / MCP / Web 后台里复用同一份实现。
 */
export interface FileAdapterOptions {
  /** 数据文件路径；父目录不存在会自动创建。 */
  file: string;
  /** 键前缀，用于兼容 createLocalAdapter 的命名空间习惯。 */
  keyPrefix?: string;
}

export interface FileAdapter extends StorageAdapter {
  readonly kind: 'file';
  readonly file: string;
  /** 把整份键值快照写盘（导出用）。 */
  snapshot(): Record<string, string>;
}

export function createFileAdapter(options: FileAdapterOptions): FileAdapter {
  const file = resolve(options.file);
  const prefix = options.keyPrefix ?? '';
  let cache: Record<string, string> | null = null;
  /* 读取失败必须能被上层看见：否则「文件损坏」与「文件不存在」都表现为
     「还没有任何数据」，用户可能以为数据丢了、或者直接重新录入覆盖掉可修复的原文件。 */
  let degraded = false;
  let loadError = '';

  const load = (): Record<string, string> => {
    if (cache) return cache;
    if (!existsSync(file)) {
      cache = {};
      return cache;
    }
    const raw = readFileSync(file, 'utf8');
    if (!raw.trim()) {
      cache = {};
      return cache;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      // 不静默吞掉：损坏的数据文件必须让人知道，否则下一次写入就覆盖了唯一副本。
      degraded = true;
      loadError = `数据文件无法解析，已拒绝读取以保护原数据：${file}`;
      throw new Error(`${loadError}\n${(e as Error).message}`);
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      degraded = true;
      loadError = `数据文件格式异常（应为对象）：${file}`;
      throw new Error(loadError);
    }
    /* 跨端兼容：网页版「导出备份」写出的是裸状态
       { schema, persons, events, ... }，而 CLI/桌面用的是键值包装
       { eqworker_db_v1: "<json>" }。以前这里只收字符串值，
       裸格式的全部字段都是对象/数组，会被静默过滤成空数据，
       用户把网页备份放进数据目录后只会看到「还没有任何数据」。
       检测到裸格式就整体包装成 DB_KEY。 */
    const obj = parsed as Record<string, unknown>;
    const looksLikeBareState =
      Array.isArray(obj.persons) &&
      (Array.isArray(obj.events) || obj.events === undefined) &&
      !('eqworker_db_v1' in obj);

    cache = {};
    if (looksLikeBareState) {
      const { app, version, exportedAt, ...state } = obj as Record<string, unknown>;
      void app; void version; void exportedAt;
      cache['eqworker_db_v1'] = JSON.stringify(state);
      return cache;
    }
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === 'string') cache[k] = v;
    }
    return cache;
  };

  const persist = (data: Record<string, string>): void => {
    mkdirSync(dirname(file), { recursive: true });
    const tmp = join(dirname(file), `.${Date.now()}.tmp`);
    writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
    try {
      renameSync(tmp, file);
    } catch (e) {
      // Windows 上 rename 到已存在文件可能失败，退化为先删后写（仍有短暂窗口）
      try {
        if (existsSync(file)) unlinkSync(file);
        renameSync(tmp, file);
      } catch {
        throw e;
      }
    }
  };

  return {
    kind: 'file',
    file,
    get degraded() { return degraded; },
    get loadError() { return loadError; },
    getItem(k: string): string | null {
      const data = load();
      const key = prefix + k;
      return key in data ? data[key] : null;
    },
    setItem(k: string, v: string): boolean {
      try {
        const data = load();
        data[prefix + k] = String(v);
        persist(data);
        return true;
      } catch {
        return false;
      }
    },
    removeItem(k: string): void {
      const data = load();
      delete data[prefix + k];
      persist(data);
    },
    snapshot(): Record<string, string> {
      return { ...load() };
    }
  };
}

/**
 * 便捷构造：建 Store 并立即加载。
 *
 * 这里必须显式 load()：createStore 只创建空状态，不会自动读盘。
 * 少了这一步，CLI 每次启动都是空库，写回时会把磁盘上的真实数据覆盖掉
 * ——这类「看起来能跑但会毁数据」的缺陷比崩溃更危险。
 */
export function createFileStore(file: string, keyPrefix = ''): Store {
  const store = createStore(createFileAdapter({ file, keyPrefix }));
  store.load();
  return store;
}
