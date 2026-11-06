import { describe, expect, it } from 'vitest';
import { DB_KEY, AI_KEY, SCHEMA_VERSION } from '../src/constants';
import { createMemoryAdapter } from '../src/storage/adapter';
import { createLocalAdapter, type StorageLike } from '../src/storage/local';
import { migrate } from '../src/storage/migrate';
import { createStore } from '../src/storage/store';

const V4 = {
  schema: 4,
  persons: [
    {
      id: 'p1', name: '张三', identity: '朋友', tags: ['同事'],
      birthday: '1990-05-20', anniversary: '2020-05-20',
      likes: '喝茶', taboos: '不喝酒', note: '老同学', adjust: 3, createdAt: 1700000000000
    }
  ],
  events: [
    { id: 'e1', personId: 'p1', type: 'gift_get', title: '婚礼礼金', time: 1700000000000, weight: 4, note: '现金', amount: 1200, dir: 'in', occasion: '婚礼' },
    { id: 'e2', personId: 'p1', type: 'meal', title: '火锅', time: 1700000000001, weight: 7, note: '', amount: 0, occasion: '日常' }
  ],
  reminders: [{ id: 'r1', personId: 'p1', content: '回礼', date: '2026-12-01', status: 'pending' }],
  progress: { wedding: { best: 90, times: 2 } },
  streak: { n: 5, last: '2026-10-30' },
  settings: { giftTier: 'generous', cityTier: '一线' }
};

describe('storage adapter 契约', () => {
  it('memory adapter：get/set/remove 与 keys', () => {
    const a = createMemoryAdapter();
    expect(a.getItem('x')).toBeNull();
    expect(a.setItem('x', '1')).toBe(true);
    expect(a.getItem('x')).toBe('1');
    a.removeItem('x');
    expect(a.getItem('x')).toBeNull();
    expect(a.keys()).toEqual([]);
  });

  it('local adapter：正常读写走传入的 storage', () => {
    const mem = new Map<string, string>();
    const backing: StorageLike = {
      getItem: (k) => (mem.has(k) ? (mem.get(k) as string) : null),
      setItem: (k, v) => void mem.set(k, v),
      removeItem: (k) => void mem.delete(k)
    };
    const a = createLocalAdapter({ storage: backing });
    expect(a.degraded).toBe(false);
    expect(a.setItem('k', 'v')).toBe(true);
    expect(a.getItem('k')).toBe('v');
    a.removeItem('k');
    expect(a.getItem('k')).toBeNull();
  });

  it('local adapter：写入失败后读取内存中的新值而不是持久化旧值', () => {
    const backing: StorageLike = {
      getItem: () => 'old',
      setItem: () => { throw new Error('quota'); },
      removeItem: () => undefined
    };
    const adapter = createLocalAdapter({ storage: backing });
    expect(adapter.setItem('k', 'new')).toBe(false);
    expect(adapter.getItem('k')).toBe('new');
  });

  it('local adapter：storage 抛错时降级为内存并保持可读', () => {
    const backing: StorageLike = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
      removeItem: () => {
        throw new Error('SecurityError');
      }
    };
    const a = createLocalAdapter({ storage: backing });
    expect(a.setItem('k', 'v')).toBe(false);
    expect(a.degraded).toBe(true);
    expect(a.getItem('k')).toBe('v');
  });
});

describe('migrate v4 → v5', () => {
  it('无损保留 persons/events/金额/备注，并补齐 settings.ai 与 meta', () => {
    const r = migrate(V4);
    expect(r.from).toBe(4);
    expect(r.to).toBe(5);
    expect(r.state.meta.schema).toBe(SCHEMA_VERSION);
    expect(typeof r.state.meta.updatedAt).toBe('number');
    expect(r.state.persons).toHaveLength(1);
    expect(r.state.persons[0].name).toBe('张三');
    expect(r.state.persons[0].likes).toBe('喝茶');
    expect(r.state.persons[0].note).toBe('老同学');
    expect(r.state.persons[0].anniversary).toBe('05-20');
    expect(r.state.events).toHaveLength(2);
    expect(r.state.events[0].amount).toBe(1200);
    expect(r.state.events[0].note).toBe('现金');
    expect(r.state.events[0].occasion).toBe('婚礼');
    expect(r.state.events[1].amount).toBe(0);
    expect(r.state.reminders[0].content).toBe('回礼');
    expect(r.state.progress.wedding).toEqual({ best: 90, times: 2 });
    expect(r.state.streak).toEqual({ n: 5, last: '2026-10-30' });
    expect(r.state.settings.giftTier).toBe('generous');
    expect(r.state.settings.cityTier).toBe('一线');
    expect(r.state.settings.ai).toEqual({ enabled: false, providerId: '', model: '', baseUrl: '', temperature: 0.7 });
  });

  it('脏数据走 sanitizeImport 修正而不是崩溃', () => {
    const r = migrate({
      schema: 4,
      persons: [{ name: 'A' }, { name: ' ' }, null],
      events: 'oops',
      progress: { s1: { best: 'x', times: 1 } },
      settings: { giftTier: 'bad' }
    });
    expect(r.state.persons).toHaveLength(1);
    expect(r.state.events).toHaveLength(0);
    expect(r.state.progress.s1.best).toBe(0);
    expect(r.state.settings.giftTier).toBe('standard');
    expect(r.warnings.length).toBeGreaterThan(0);
  });
});

describe('store', () => {
  it.each([4, 5])('schema %s 的特殊 progress 键迁移保存后可序列化并重载', (schema) => {
    const raw = `{"schema":${schema},"persons":[],"progress":{"__proto__":{"best":4,"times":2},"constructor":{"best":3,"times":1},"toString":{"best":2,"times":1}}}`;
    const adapter = createMemoryAdapter({ [DB_KEY]: raw });
    const store = createStore(adapter);
    expect(store.load()).toBe(true);
    expect(store.save()).toBe(true);
    const saved = JSON.parse(adapter.getItem(DB_KEY)!);
    expect(Object.hasOwn(saved.progress, '__proto__')).toBe(true);
    expect(saved.progress.__proto__).toEqual({ best: 4, times: 2 });
    expect(saved.progress.constructor).toEqual({ best: 3, times: 1 });
    expect(saved.progress.toString).toEqual({ best: 2, times: 1 });
    const reloaded = createStore(adapter);
    expect(reloaded.load()).toBe(true);
    expect(JSON.parse(reloaded.exportJSON()).progress).toEqual(saved.progress);
    expect({}).not.toHaveProperty('best');
  });
  it('迁移完整日期并保留原始年份备份，重启后仍可保存', () => {
    const raw = JSON.stringify(V4);
    const adapter = createMemoryAdapter({ [DB_KEY]: raw });
    const store = createStore(adapter);
    expect(store.load()).toBe(true);
    expect(store.isWriteProtected()).toBe(false);
    expect(store.getState().persons[0].birthday).toBe('05-20');
    expect(store.save()).toBe(true);
    expect(adapter.keys().some((key) => key !== DB_KEY && adapter.getItem(key) === raw)).toBe(true);
    const reloaded = createStore(adapter);
    expect(reloaded.load()).toBe(true);
    expect(reloaded.getState().persons[0].birthday).toBe('05-20');
    expect(reloaded.save()).toBe(true);
  });

  it('备份无法持久化时不覆盖需要日期转换的原始数据', () => {
    const raw = JSON.stringify(V4);
    const adapter = createMemoryAdapter({ [DB_KEY]: raw });
    const originalSet = adapter.setItem;
    adapter.setItem = (key, value) => key === DB_KEY ? originalSet(key, value) : false;
    const store = createStore(adapter);
    expect(store.load()).toBe(true);
    expect(store.save()).toBe(false);
    expect(adapter.getItem(DB_KEY)).toBe(raw);
  });

  it('旧备份不同于原始数据时，不覆盖旧备份，但当前原文另存且主库可写', () => {
    /* 设计取舍：旧备份是更早一次迁移的原始数据，不能覆盖；
       但也不能因此把用户锁死——把当前原文另存为独立键，两份都保全。 */
    const raw = JSON.stringify(V4);
    const backupKey = `${DB_KEY}_migration_backup`;
    const adapter = createMemoryAdapter({ [DB_KEY]: raw, [backupKey]: 'previous backup' });
    const store = createStore(adapter);
    const keysBefore = new Set(adapter.keys());
    expect(store.load()).toBe(true);
    expect(adapter.getItem(backupKey)).toBe('previous backup');
    // 当前原文被另存到一个新键
    const added = adapter.keys().filter((k) => !keysBefore.has(k) && k.startsWith(backupKey));
    expect(added.length).toBeGreaterThan(0);
    expect(adapter.getItem(added[0] as string)).toBe(raw);
    // 主库仍可写，用户不会因为「有过一次旧备份」而永久只读
    expect(store.save()).toBe(true);
  });

  it.each(['{bad', '', 'null', '{"persons":{}}'])('损坏原始值 %s 不被后续保存覆盖', (raw) => {
    const adapter = createMemoryAdapter({ [DB_KEY]: raw });
    const store = createStore(adapter);
    expect(store.load()).toBe(false);
    expect(store.save()).toBe(false);
    expect(adapter.getItem(DB_KEY)).toBe(raw);
  });

  it.each(['bad', null, [], { schema: 'five' }, { schema: 5, updatedAt: 'bad' }])('损坏 meta %j 保留原文', (meta) => {
    const raw = JSON.stringify({ schema: 5, persons: [], meta });
    const adapter = createMemoryAdapter({ [DB_KEY]: raw });
    const store = createStore(adapter);
    store.load();
    expect(store.save()).toBe(false);
    expect(adapter.getItem(DB_KEY)).toBe(raw);
  });

  it('本地适配器吞掉读取异常时同样禁止覆盖', () => {
    let writes = 0;
    const adapter = createLocalAdapter({ storage: { getItem() { throw new Error('read denied'); }, setItem() { writes++; }, removeItem() {} } });
    const store = createStore(adapter);
    expect(store.load()).toBe(false);
    expect(store.save()).toBe(false);
    expect(writes).toBe(0);
  });

  it('读取异常不允许写回，缺失键则允许保存', () => {
    let writes = 0;
    const failed = createStore({ getItem() { throw new Error('read denied'); }, setItem() { writes++; return true; }, removeItem() {} });
    expect(failed.load()).toBe(false);
    expect(failed.save()).toBe(false);
    expect(writes).toBe(0);
    const empty = createStore(createMemoryAdapter());
    expect(empty.load()).toBe(false);
    expect(empty.save()).toBe(true);
  });

  it('从旧 key rqsg_radar_v2 读取 v4 数据并写回 v5', () => {
    const adapter = createMemoryAdapter({ rqsg_radar_v2: JSON.stringify({ ...V4, persons: V4.persons.map((person) => ({ ...person, birthday: '05-20', anniversary: '05-20' })) }) });
    const store = createStore(adapter);
    expect(store.load()).toBe(true);
    expect(store.getState().persons[0].name).toBe('张三');
    expect(store.getState().settings.ai.enabled).toBe(false);

    const saved = JSON.parse(adapter.getItem(DB_KEY) as string);
    expect(saved.schema).toBe(5);
    expect(saved.meta.schema).toBe(5);
    expect(saved.persons[0].name).toBe('张三');
    expect(saved.events[0].amount).toBe(1200);
  });

  it('本地缓存损坏时 load 返回 false 且状态保持空', () => {
    const adapter = createMemoryAdapter({ [DB_KEY]: '{not json' });
    const store = createStore(adapter);
    expect(store.load()).toBe(false);
    expect(store.getState().persons).toEqual([]);
  });

  it('importObjects 拒绝缺少 persons 的文件', () => {
    const store = createStore(createMemoryAdapter());
    const r = store.importObjects({ events: [] });
    expect(r.applied).toBe(false);
    expect(store.getState().persons).toHaveLength(0);
  });

  it('importObjects 应用清洗后的数据并落盘', () => {
    const adapter = createMemoryAdapter();
    const store = createStore(adapter);
    const r = store.importObjects(V4);
    expect(r.applied).toBe(true);
    expect(store.getState().persons).toHaveLength(1);
    expect(store.getState().settings.ai.enabled).toBe(false);
    const saved = JSON.parse(adapter.getItem(DB_KEY) as string);
    expect(saved.schema).toBe(5);
  });

  it('导出保留关系数据但移除 AI 连接配置', () => {
    const store = createStore(createMemoryAdapter());
    const r = store.importObjects({
      ...V4,
      settings: {
        ...V4.settings,
        ai: {
          enabled: true,
          providerId: 'custom-provider',
          model: 'private-model',
          baseUrl: 'https://private.example/v1?token=should-not-export',
          temperature: 1.2
        }
      }
    });
    expect(r.applied).toBe(true);

    const exported = JSON.parse(store.exportJSON()) as typeof V4 & { settings: { ai: unknown } };
    expect(exported.persons[0]?.name).toBe('张三');
    expect(exported.events[0]?.amount).toBe(1200);
    expect(exported.settings.ai).toEqual({
      enabled: false,
      providerId: '',
      model: '',
      baseUrl: '',
      temperature: 0.7
    });
    expect(JSON.stringify(exported)).not.toContain('private-provider');
    expect(JSON.stringify(exported)).not.toContain('private-model');
    expect(JSON.stringify(exported)).not.toContain('should-not-export');
  });

  it('AI key 独立存放，不进入导出 JSON，clearAIKey 可清除', () => {
    const adapter = createMemoryAdapter();
    const store = createStore(adapter);
    expect(store.getAIKey()).toBeNull();
    expect(store.setAIKey('sk-test-secret')).toBe(true);
    expect(adapter.getItem(AI_KEY)).toBe('sk-test-secret');
    expect(store.getAIKey()).toBe('sk-test-secret');

    store.importObjects(V4);
    store.setAIKey('sk-test-secret');
    const exported = store.exportJSON();
    expect(exported).not.toContain('sk-test-secret');
    expect(JSON.parse(exported).settings.ai).toEqual({ enabled: false, providerId: '', model: '', baseUrl: '', temperature: 0.7 });

    store.clearAIKey();
    expect(store.getAIKey()).toBeNull();
  });

  it('save 后 load 能恢复完整状态', () => {
    const adapter = createMemoryAdapter();
    const store = createStore(adapter);
    store.importObjects(V4);
    const before = store.getState();

    const store2 = createStore(adapter);
    expect(store2.load()).toBe(true);
    expect(store2.getState().persons[0].name).toBe(before.persons[0].name);
    expect(store2.getState().events[0].amount).toBe(1200);
    expect(store2.getState().settings.giftTier).toBe('generous');
  });
});
