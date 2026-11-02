import { describe, it, expect } from 'vitest';
import { createStore, createLocalAdapter, createEmptyState, commitPractice, recordPractice } from '../src/index';

function memoryAdapter() {
  const map = new Map<string, string>();
  return {
    map,
    adapter: createLocalAdapter({
      keyPrefix: 'test_',
      storage: {
        getItem: (k: string) => map.get(k) ?? null,
        setItem: (k: string, v: string) => { map.set(k, v); },
        removeItem: (k: string) => { map.delete(k); }
      }
    })
  };
}

describe('Store.setState', () => {
  it('纯函数式替换状态后，save() 落库的是新状态而不是旧闭包状态', () => {
    const { map, adapter } = memoryAdapter();
    const store = createStore(adapter);
    const base = store.getState();
    const sc = 'wedding';
    const result = recordPractice(base, sc, 1, Date.now())!;
    const next = commitPractice(base, result, sc);

    // 只改 store 内部状态，不调用 setState 时，save 写的是旧状态——这是曾经的缺陷
    store.setState(next);
    expect(store.save()).toBe(true);

    const raw = map.get('test_eqworker_db_v1')!;
    const body = JSON.parse(raw);
    expect(body.progress[sc]).toBeDefined();
    expect(body.progress[sc].times).toBe(1);
    expect(body.streak.n).toBeGreaterThanOrEqual(1);
  });

  it('未调用 setState 时，save 反映的是 store 内当前状态', () => {
    const { adapter } = memoryAdapter();
    const store = createStore(adapter);
    expect(store.getState().persons).toHaveLength(0);
    store.setState({ ...createEmptyState(), streak: { n: 5, last: '2026-11-02' } });
    expect(store.getState().streak.n).toBe(5);
  });
});
