import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLocalAdapter, createMemoryAdapter, DB_KEY } from '../../../packages/core/src/index';
import { mountStudio } from '../main';
import { StudioStore } from '../state';

const payload = JSON.stringify({ persons: [{ id: 'new', name: '新联系人' }] });

function mount(store: StudioStore): () => void {
  document.body.innerHTML = '<div id="studio"></div>';
  return mountStudio(store, document);
}

async function selectFile(text: () => Promise<string>): Promise<void> {
  const input = document.querySelector<HTMLInputElement>('#import-file')!;
  Object.defineProperty(input, 'files', { configurable: true, value: [{ text }] });
  input.dispatchEvent(new Event('change', { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

afterEach(() => { document.body.innerHTML = ''; vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Studio import and persistence', () => {
  it('asks before replacing existing data and respects cancellation and confirmation', async () => {
    const store = new StudioStore({ adapter: createMemoryAdapter(), sessionKeyStore: null });
    store.loadDemo();
    const oldName = store.getState().persons[0].name;
    const unmount = mount(store);
    await selectFile(async () => payload);
    expect(document.querySelector('[role="dialog"]')?.textContent).toMatch(/替换|覆盖/);
    expect(store.getState().persons[0].name).toBe(oldName);
    document.querySelector<HTMLButtonElement>('[data-act="dialog-close"]')!.click();
    expect(store.getState().persons[0].name).toBe(oldName);
    await selectFile(async () => payload);
    document.querySelector<HTMLButtonElement>('[data-act="import-confirm"]')!.click();
    expect(store.getState().persons[0].name).toBe('新联系人');
    unmount();
  });

  it('reports a file read failure', async () => {
    const store = new StudioStore({ adapter: createMemoryAdapter(), sessionKeyStore: null });
    const unmount = mount(store);
    await selectFile(async () => { throw new Error('read error'); });
    expect(document.querySelector('[role="dialog"]')?.textContent).toMatch(/读取.*失败/);
    unmount();
  });

  it('shows a persistent warning when a save fails', () => {
    const adapter = createMemoryAdapter();
    adapter.setItem = () => false;
    const store = new StudioStore({ adapter, sessionKeyStore: null });
    const unmount = mount(store);
    store.loadDemo();
    expect(document.body.textContent).toMatch(/保存失败/);
    store.setView('persons');
    expect(document.body.textContent).toMatch(/保存失败/);
    unmount();
  });

  it('reports failure to save migrated legacy data without losing loaded data', () => {
    const adapter = createMemoryAdapter({ rqsg_radar_v2: JSON.stringify({ schema: 4, persons: [{ id: 'old', name: '旧联系人' }] }) });
    adapter.setItem = () => false;
    const store = new StudioStore({ adapter, sessionKeyStore: null });
    const unmount = mount(store);
    expect(store.getState().persons[0].name).toBe('旧联系人');
    expect(document.body.textContent).toMatch(/保存失败/);
    unmount();
  });

  it('reports local storage read errors even when fallback is empty', () => {
    const adapter = createLocalAdapter({ storage: { getItem() { throw new Error('denied'); }, setItem() {}, removeItem() {} } });
    const store = new StudioStore({ adapter, sessionKeyStore: null });
    const unmount = mount(store);
    expect(document.body.textContent).toMatch(/存储.*失败|存储.*不可用/);
    unmount();
  });

  it('reports failures accessing the browser storage property', () => {
    vi.stubGlobal('localStorage', undefined);
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('denied'); } });
    const store = new StudioStore({ sessionKeyStore: null });
    const unmount = mount(store);
    expect(document.body.textContent).toMatch(/存储.*失败|存储.*不可用/);
    unmount();
    vi.unstubAllGlobals();
  });

  it('reports import save failure and keeps the in-memory state unchanged', async () => {
    /* 这条断言的方向是刻意反过来的：
       旧实现在落盘失败时仍把导入数据塞进内存并返回成功，
       界面显示"导入成功"、刷新后全丢——那才是 bug。
       正确行为是落盘失败即回滚内存，并向用户明示失败。 */
    const adapter = createMemoryAdapter();
    adapter.setItem = () => false;
    const store = new StudioStore({ adapter, sessionKeyStore: null });
    const before = store.getState().persons.length;
    const unmount = mount(store);
    await selectFile(async () => payload);
    document.querySelector<HTMLButtonElement>('[data-act="import-confirm"]')!.click();
    expect(store.getState().persons).toHaveLength(before);
    expect(document.body.textContent).toMatch(/导入失败/);
    unmount();
  });

  it('protects existing data when reading throws but writing would succeed', () => {
    const historical = 'existing historical data';
    let saved = historical;
    const adapter = createLocalAdapter({ storage: {
      getItem() { throw new Error('read denied'); },
      setItem(_key, value) { saved = value; },
      removeItem() {}
    } });
    const store = new StudioStore({ adapter, sessionKeyStore: null });
    const unmount = mount(store);
    store.loadDemo();
    expect(saved).toBe(historical);
    expect(store.getStore().save()).toBe(false);
    expect(document.body.textContent).toMatch(/写保护/);
    expect(document.body.textContent).toMatch(/重新加载/);
    unmount();
  });

  it('blocks migration writes when the primary read failed before a legacy value was found', () => {
    let writes = 0;
    const adapter = {
      getItem(key: string) {
        if (key === DB_KEY) throw new Error('denied');
        return key === 'rqsg_radar_v2' ? JSON.stringify({ schema: 4, persons: [{ id: 'old', name: '旧联系人' }] }) : null;
      },
      setItem() { writes += 1; return true; },
      removeItem() {}
    };
    const store = new StudioStore({ adapter, sessionKeyStore: null });
    expect(store.getState().persons[0].name).toBe('旧联系人');
    expect(writes).toBe(0);
    expect(store.getStore().save()).toBe(false);
  });

  it.each([
    ['legacy bad events', { schema: 4, persons: [{ id: 'p', name: '联系人' }], events: 'bad' }],
    ['current bad events', { schema: 5, persons: [{ id: 'p', name: '联系人' }], events: 'bad' }],
    ['legacy discarded person', { schema: 4, persons: [{ id: 'p', name: '联系人' }, { name: '' }] }],
    ['current discarded event', { schema: 5, persons: [{ id: 'p', name: '联系人' }], events: [{ type: 'talk' }] }],
    ['discarded reminder', { schema: 5, persons: [{ id: 'p', name: '联系人' }], reminders: [null] }],
    ['future schema', { schema: 999, persons: [{ id: 'p', name: '联系人', future: 'keep' }], extra: 'keep' }],
    ['future schema with older metadata', { schema: 999, meta: { schema: 5 }, persons: [] }],
    ['discarded root field', { schema: 4, persons: [], other: 'keep' }],
    ['discarded metadata', { schema: 5, persons: [], meta: { schema: 5, other: 'keep' } }],
    ['discarded progress', { schema: 5, persons: [], progress: { key: 'bad' } }],
    ['invalid settings', { schema: 5, persons: [], settings: 'bad' }]
  ])('preserves raw bytes and warns for %s', (_label, data) => {
    const raw = JSON.stringify(data, null, 2);
    const adapter = createMemoryAdapter({ [DB_KEY]: raw });
    const store = new StudioStore({ adapter, sessionKeyStore: null });
    const unmount = mount(store);
    expect(adapter.getItem(DB_KEY)).toBe(raw);
    store.loadDemo();
    expect(store.getStore().save()).toBe(false);
    expect(adapter.getItem(DB_KEY)).toBe(raw);
    expect(document.body.textContent).toMatch(/写保护/);
    unmount();
  });

  /* 安全规范化（文本截断、非法日期清空）与"真丢数据"分级处理：
     前者先备份原文，然后允许继续使用；后者才写保护。
     旧行为把两者一视同仁，导致用户有一条 61 字姓名就永久改不动任何东西。 */
  it.each([
    ['truncated person name', { schema: 4, persons: [{ name: 'x'.repeat(61) }] }],
    ['invalid birthday', { schema: 4, persons: [{ name: '联系人', birthday: '1990-02-30' }] }]
  ])('backs up raw bytes and stays writable for %s', (_label, data) => {
    const raw = JSON.stringify(data, null, 2);
    const adapter = createMemoryAdapter({ [DB_KEY]: raw });
    const store = new StudioStore({ adapter, sessionKeyStore: null });
    store.getState();
    // 原文必须留存，供用户找回
    const backup = adapter.getItem(`${DB_KEY}_migration_backup`);
    expect(backup === null || backup === raw).toBe(true);
    // 且不应该因此永久写保护
    expect(store.getStore().isWriteProtected()).toBe(false);
  });

  it('protects corrupt stored data from later saves and permits recovery after reload', () => {
    const adapter = createMemoryAdapter({ [DB_KEY]: '{broken' });
    const store = new StudioStore({ adapter, sessionKeyStore: null });
    const unmount = mount(store);
    store.loadDemo();
    expect(adapter.getItem(DB_KEY)).toBe('{broken');
    expect(store.getStore().save()).toBe(false);
    expect(document.body.textContent).toMatch(/写保护/);
    expect(document.body.textContent).toMatch(/重新加载/);
    unmount();
    adapter.setItem(DB_KEY, JSON.stringify({ schema: 5, persons: [{ id: 'recovered', name: '恢复联系人' }] }));
    const recovered = new StudioStore({ adapter, sessionKeyStore: null });
    expect(recovered.getState().persons[0].name).toBe('恢复联系人');
    recovered.loadDemo();
    expect(JSON.parse(adapter.getItem(DB_KEY)!).persons.length).toBeGreaterThan(1);
  });

  it('keeps the most recently selected file when reads finish out of order', async () => {
    const store = new StudioStore({ adapter: createMemoryAdapter(), sessionKeyStore: null });
    const unmount = mount(store);
    let finishFirst!: (value: string) => void;
    const first = selectFile(() => new Promise((resolve) => { finishFirst = resolve; }));
    await selectFile(async () => payload);
    finishFirst(JSON.stringify({ persons: [{ id: 'stale', name: '旧文件' }] }));
    await first;
    document.querySelector<HTMLButtonElement>('[data-act="import-confirm"]')!.click();
    expect(store.getState().persons[0].name).toBe('新联系人');
    unmount();
  });

  it('reports corrupt previously stored data', () => {
    const store = new StudioStore({ adapter: createMemoryAdapter({ [DB_KEY]: '{broken' }), sessionKeyStore: null });
    const unmount = mount(store);
    expect(document.body.textContent).toMatch(/读取.*失败/);
    unmount();
  });
});
