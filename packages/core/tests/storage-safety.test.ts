import { describe, expect, it } from 'vitest';
import { createStore } from '../src/storage/store';
import type { StorageAdapter } from '../src/storage/adapter';

const DB = 'eqworker_db_v1';

function memoryAdapter(seed?: string): StorageAdapter & { dump(): Map<string, string> } {
  const m = new Map<string, string>();
  if (seed) m.set(DB, seed);
  return {
    getItem: (k: string) => (m.has(k) ? (m.get(k) as string) : null),
    setItem: (k: string, v: string) => { m.set(k, v); return true; },
    removeItem: (k: string) => { m.delete(k); },
    dump: () => m
  };
}

function failingAdapter(): StorageAdapter {
  const m = new Map<string, string>();
  let fail = false;
  return {
    getItem: (k: string) => (m.has(k) ? (m.get(k) as string) : null),
    setItem: (k: string, v: string) => { if (fail) return false; m.set(k, v); return true; },
    removeItem: (k: string) => { m.delete(k); },
    failNextWrites: () => { fail = true; }
  } as StorageAdapter & { failNextWrites(): void };
}

const person = (id: string, name: string) => ({
  id, name, identity: '朋友', tags: [] as string[], birthday: '', anniversary: '',
  likes: '', taboos: '', note: '', adjust: 0, createdAt: 1
});

function v5(persons: unknown[] = [person('p1', '张三')], events: unknown[] = []) {
  return JSON.stringify({
    schema: 5, persons, events, reminders: [], progress: {}, streak: {},
    settings: {}, meta: { schema: 5, updatedAt: 1 }
  });
}

describe('存储写保护（不能让用户「今天突然改不动」）', () => {
  it('v4 遗留的 person.updatedAt 不再触发写保护', () => {
    const seed = JSON.stringify({
      schema: 4,
      persons: [{ ...person('p1', '张三'), updatedAt: 1730000000000 }],
      events: [], reminders: [], progress: {}, streak: {}, settings: {},
      meta: { schema: 4, updatedAt: 1 }
    });
    const store = createStore(memoryAdapter(seed));
    expect(store.load()).toBe(true);
    expect(store.isWriteProtected()).toBe(false);
    expect(store.save()).toBe(true);
  });

  it('事件里的历史遗留字段（lastContact 等）不触发写保护', () => {
    const seed = v5([person('p1', '张三')], [{
      id: 'e1', personId: 'p1', type: 'meal', title: '吃饭', time: 1,
      weight: 7, note: '', amount: 0, dir: 'none', occasion: '日常',
      lastContact: 123, source: 'import'
    }]);
    const store = createStore(memoryAdapter(seed));
    store.load();
    expect(store.isWriteProtected()).toBe(false);
  });

  it('金额配 dir:none 在保存时被归一，重新加载后仍可写', () => {
    const adapter = memoryAdapter();
    const store = createStore(adapter);
    store.load();
    store.setState({
      ...store.getState(),
      persons: [person('x', '王五')] as never,
      events: [{
        id: 'e', personId: 'x', type: 'gift_give', title: '送礼', time: Date.now(),
        weight: 4, note: '', amount: 500, dir: 'none', occasion: '婚礼'
      }] as never
    });
    expect(store.save()).toBe(true);
    expect(store.getState().events[0].dir).toBe('out');
    const reloaded = createStore(memoryAdapter(adapter.dump().get(DB)));
    reloaded.load();
    expect(reloaded.isWriteProtected()).toBe(false);
    expect(reloaded.save()).toBe(true);
  });

  it('超长 note / 超量标签：拒写并保留原值，不静默截断', () => {
    /* 产品决定：静默改写用户输入比报错更糟。
       用户填了 600 字备注，保存后变成 500 字且提示成功——这是数据损坏。
       现在改为拒写，让界面如实提示「内容超长」。 */
    const adapter = memoryAdapter();
    const store = createStore(adapter);
    store.load();
    store.setState({
      ...store.getState(),
      persons: [{
        ...person('y', '赵六'),
        tags: Array.from({ length: 12 }, (_, i) => 't' + i),
        note: 'x'.repeat(600)
      }] as never
    });
    expect(store.save()).toBe(false);
    expect(store.getState().persons[0].note).toHaveLength(600);
  });

  it('全日期生日与超量标签在长度合法时被规范化，且重新加载仍可写', () => {
    const adapter = memoryAdapter();
    const store = createStore(adapter);
    store.load();
    store.setState({
      ...store.getState(),
      persons: [{ ...person('y', '赵六'), birthday: '1990-05-20', tags: ['a', 'b'] }] as never
    });
    expect(store.save()).toBe(true);
    expect(store.getState().persons[0].birthday).toBe('05-20');
    const reloaded = createStore(memoryAdapter(adapter.dump().get(DB)));
    reloaded.load();
    expect(reloaded.save()).toBe(true);
  });

  it('金额超出上限时拒写，不把 99999999 静默存成 10000000', () => {
    const adapter = memoryAdapter();
    const store = createStore(adapter);
    store.load();
    store.setState({
      ...store.getState(),
      persons: [person('a', '张三')] as never,
      events: [{
        id: 'e', personId: 'a', type: 'gift_give', title: '送礼', time: Date.now(),
        weight: 4, note: '', amount: 99_999_999, dir: 'out', occasion: '婚礼'
      }] as never
    });
    expect(store.save()).toBe(false);
  });
});

describe('导入安全（不能静默清空或假装成功）', () => {
  it('空 persons 导入被拒绝，现有数据保留', () => {
    const adapter = memoryAdapter(v5());
    const store = createStore(adapter);
    store.load();
    const before = store.getState().persons.length;
    const result = store.importObjects({ persons: [] });
    expect(result.applied).toBe(false);
    expect(result.warnings.join()).toContain('没有可用的联系人');
    expect(store.getState().persons).toHaveLength(before);
  });

  it('全部联系人无名字时同样拒绝（清洗后为空）', () => {
    const adapter = memoryAdapter(v5());
    const store = createStore(adapter);
    store.load();
    const result = store.importObjects({ persons: [{ identity: '朋友' }, { name: '   ' }] });
    expect(result.applied).toBe(false);
    expect(store.getState().persons).toHaveLength(1);
  });

  it('写入失败时返回 applied:false 并回滚内存状态', () => {
    const adapter = failingAdapter();
    const store = createStore(adapter);
    store.load();
    (adapter as unknown as { failNextWrites(): void }).failNextWrites();
    const result = store.importObjects({ persons: [person('n1', '李四')] });
    expect(result.applied).toBe(false);
    expect(result.warnings.join()).toContain('写入本机存储失败');
    expect(store.getState().persons).toHaveLength(0);
  });

  it('清洗警告会返回给调用方（不再吞掉）', () => {
    const store = createStore(memoryAdapter());
    store.load();
    const result = store.importObjects({
      persons: [person('a', '张三'), { identity: '朋友' }]
    });
    expect(result.applied).toBe(true);
    expect(result.warnings.join()).toContain('人脉 1 条');
  });
});

describe('导入/导出往返', () => {
  it('导出的数据可以原样导入回来', () => {
    const adapter = memoryAdapter();
    const store = createStore(adapter);
    store.load();
    store.setState({
      ...store.getState(),
      persons: [person('a', '张三')] as never,
      events: [{
        id: 'e1', personId: 'a', type: 'gift_get', title: '收礼', time: Date.now(),
        weight: 4, note: '', amount: 500, dir: 'in', occasion: '婚礼'
      }] as never
    });
    store.save();
    const exported = JSON.parse(store.exportJSON());

    const target = createStore(memoryAdapter());
    target.load();
    const result = target.importObjects(exported);
    expect(result.applied).toBe(true);
    expect(target.getState().persons).toHaveLength(1);
    expect(target.getState().events).toHaveLength(1);
  });
});
