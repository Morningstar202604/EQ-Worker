import { describe, expect, it } from 'vitest';
import { MemoryStore, type MemoryStorage } from '../src/index';

const API_KEY = 'sk-must-never-be-exported-123456';

function memoryStorage(): MemoryStorage & { dump(): string } {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
    dump: () => [...data.values()].join('\n')
  };
}

describe('MemoryStore', () => {
  it('uses a default window of eight turns', () => {
    const store = new MemoryStore();
    for (let i = 1; i <= 12; i += 1) {
      store.add('p-1', { role: 'user', content: `第 ${i} 轮` });
    }

    const recent = store.recent('p-1');
    expect(recent).toHaveLength(8);
    expect(recent[0].content).toBe('第 5 轮');
    expect(recent[7].content).toBe('第 12 轮');
  });

  it('truncates to the configured window', () => {
    const store = new MemoryStore({ window: 3 });
    for (let i = 1; i <= 5; i += 1) {
      store.add('p-1', { role: 'user', content: `m${i}` });
    }

    expect(store.recent('p-1').map((message) => message.content)).toEqual(['m3', 'm4', 'm5']);
    expect(store.recent('p-1', 2).map((message) => message.content)).toEqual(['m4', 'm5']);
  });

  it('isolates people by personId', () => {
    const store = new MemoryStore();
    store.add('p-1', { role: 'user', content: '张三的消息' });
    store.add('p-2', { role: 'user', content: '李四的消息' });

    expect(store.recent('p-1')).toHaveLength(1);
    expect(store.recent('p-1')[0].content).toBe('张三的消息');
    expect(store.recent('p-2')[0].content).toBe('李四的消息');
    expect(store.recent('p-3')).toEqual([]);
  });

  it('keeps a summary of dropped turns', () => {
    const store = new MemoryStore({ window: 2 });
    store.add('p-1', { role: 'user', content: '很早以前聊过婚礼的事' });
    store.add('p-1', { role: 'assistant', content: '好的' });
    store.add('p-1', { role: 'user', content: '最近想请他吃饭' });
    store.add('p-1', { role: 'assistant', content: '可以' });

    const summary = store.summary('p-1');
    expect(summary).toContain('更早对话摘要');
    expect(store.recent('p-1')).toHaveLength(2);
  });

  it('clears one person or everything', () => {
    const store = new MemoryStore();
    store.add('p-1', { role: 'user', content: 'a' });
    store.add('p-2', { role: 'user', content: 'b' });

    store.clear('p-1');
    expect(store.recent('p-1')).toEqual([]);
    expect(store.recent('p-2')).toHaveLength(1);

    store.clear();
    expect(store.recent('p-2')).toEqual([]);
    expect(store.export().persons).toEqual([]);
  });

  it('exports grouped messages without any key material', () => {
    const store = new MemoryStore();
    store.add('p-1', { role: 'user', content: '帮我写一句祝福' });
    store.add('p-1', { role: 'assistant', content: `已生成，key=${API_KEY}` });

    const exported = store.export();
    const serialized = JSON.stringify(exported);

    expect(exported.version).toBe(1);
    expect(exported.persons).toHaveLength(1);
    expect(exported.persons[0].personId).toBe('p-1');
    expect(exported.persons[0].messages).toHaveLength(2);
    expect(serialized).not.toContain(API_KEY);
    expect(serialized).not.toContain('authorization');
  });

  it('persists to a storage adapter and restores the window', () => {
    const storage = memoryStorage();
    const store = new MemoryStore({ storage, window: 2 });
    store.add('p-1', { role: 'user', content: 'one' });
    store.add('p-1', { role: 'user', content: 'two' });
    store.add('p-1', { role: 'user', content: 'three' });

    expect(storage.dump()).not.toContain(API_KEY);

    const restored = new MemoryStore({ storage, window: 2 });
    expect(restored.recent('p-1').map((message) => message.content)).toEqual(['two', 'three']);
  });

  it('survives storage failures without losing in-memory data', () => {
    const storage: MemoryStorage = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('quota');
      },
      removeItem: () => undefined
    };
    const store = new MemoryStore({ storage });
    store.add('p-1', { role: 'user', content: 'kept' });

    expect(store.recent('p-1')[0].content).toBe('kept');
  });

  it('ignores empty messages', () => {
    const store = new MemoryStore();
    store.add('p-1', { role: 'user', content: '   ' });
    expect(store.recent('p-1')).toEqual([]);
  });
});
