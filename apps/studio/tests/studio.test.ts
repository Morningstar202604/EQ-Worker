import { describe, expect, it } from 'vitest';
import {
  buildActions,
  createMemoryAdapter,
  createStore,
  overallMetrics,
  type AppState,
  type Person
} from '../../../packages/core/src/index';
import {
  defaultAISettings,
  type FetchLike
} from '../../../packages/ai/src/index';
import { demoPayload } from '../demo';
import { StudioStore } from '../state';
import { runAssistant, previewAssistantContext } from '../assistant';
import { buildOverviewData } from '../ui/overview';
import { buildLedgerData } from '../ui/ledger';
import { buildPersonList, buildPersonDetail } from '../ui/persons';
import { renderPersons } from '../views/persons';
import { renderLedger } from '../views/ledger';
import { renderOverview } from '../views/overview';
import { renderAI } from '../views/ai';
import { buildAIViewData } from '../ui/ai';
import { mountStudio } from '../main';

const NOW = new Date('2026-10-31T10:00:00+08:00').getTime();

function makeStore(): StudioStore {
  return new StudioStore({
    adapter: createMemoryAdapter(),
    now: () => NOW,
    sessionKeyStore: null
  });
}

function makeState(persons: Person[], events: AppState['events'] = []): AppState {
  return {
    persons,
    events,
    reminders: [],
    progress: {},
    streak: { n: 0, last: '' },
    settings: {
      giftTier: 'standard',
      cityTier: '二线',
      ai: { enabled: false, providerId: '', model: '', baseUrl: '', temperature: 0.7 }
    },
    meta: { schema: 5, updatedAt: NOW },
    lastEventId: null
  };
}

function makePerson(overrides: Partial<Person> = {}): Person {
  return {
    id: 'p-test',
    name: '测试联系人',
    identity: '朋友',
    tags: ['测试'],
    birthday: '',
    anniversary: '',
    likes: '',
    taboos: '',
    note: '',
    adjust: 0,
    createdAt: NOW,
    ...overrides
  };
}

describe('Dashboard view rendering', () => {
  it('renders radar svg, action list entries and health gauge', () => {
    const store = makeStore();
    store.loadDemo();

    const data = buildOverviewData(store.getState(), NOW);
    expect(data).not.toBeNull();
    if (!data) return;

    expect(data.actions.length).toBeGreaterThan(0);
    expect(data.radarSvg).toContain('<svg');
    expect(data.radarSvg).toContain('viz-radar');
    expect(data.gaugeSvg).toContain('viz-gauge');

    const html = renderOverview(data);
    expect(html).toContain('今日行动清单');
    expect(html).toContain('data-act="action-primary"');
    expect(html).toContain('data-act="action-secondary"');
    expect(html).toMatch(/角色|index-value/);
    expect(html).toContain('radar');
  });
});

describe('Demo data through store', () => {
  it('imports demo payload with at least 6 persons and 12 events', () => {
    const store = makeStore();
    store.loadDemo();
    const state = store.getState();

    expect(state.persons.length).toBeGreaterThanOrEqual(6);
    expect(state.events.length).toBeGreaterThanOrEqual(12);

    const types = new Set(state.events.map((event) => event.type));
    expect(types.size).toBe(10);
    expect(state.events.some((event) => event.amount > 0 && event.dir === 'in')).toBe(true);
    expect(state.events.some((event) => event.amount > 0 && event.dir === 'out')).toBe(true);
    expect(state.persons.every((person) => person.name.length > 0)).toBe(true);
  });

  it('produces overallMetrics with index between 0 and 100 after import', () => {
    const store = makeStore();
    store.loadDemo();
    const metrics = overallMetrics(store.getState(), NOW);

    expect(metrics).not.toBeNull();
    expect(metrics?.index).toBeGreaterThanOrEqual(0);
    expect(metrics?.index).toBeLessThanOrEqual(100);
  });

  it('exposes actions from core after demo import', () => {
    const store = makeStore();
    store.loadDemo();
    const actions = buildActions(store.getState(), 6, NOW);
    expect(actions.length).toBeGreaterThan(0);
  });
});

describe('Persons and ledger views', () => {
  it('renders person table rows and detail radar for a selected person', () => {
    const store = makeStore();
    store.loadDemo();

    const state = store.getState();
    const selected = state.persons[0];
    const detail = buildPersonDetail(state, selected, NOW);
    const html = renderPersons({
      items: buildPersonList(state, '', 'all', NOW),
      detail,
      query: '',
      identity: 'all',
      identities: store.getIdentities()
    });

    expect(html).toContain('data-act="person-open"');
    expect(html).toContain(selected.name);
    expect(detail.radarSvg).toContain('viz-radar');
    expect(html).toContain('relation-read');
    expect(html).toContain('账本明细');
  });

  it('renders ledger totals, flow chart and per-person rows', () => {
    const store = makeStore();
    store.loadDemo();
    const data = buildLedgerData(store.getState(), NOW);

    expect(data.rows.length).toBeGreaterThanOrEqual(6);
    expect(data.flowSvg).toContain('viz-flow');

    const html = renderLedger(data);
    expect(html).toContain('每人净额');
    expect(html).toContain('关系洞察');
    expect(html).toContain('viz-network');
    expect(html).toContain('viz-trend');
    expect(html).toMatch(/<tbody>[\s\S]*<tr>/);
    expect(html).toContain('data-act="person-open"');
  });

  it('keeps relationship network, trend and ranking data in the consolidated ledger area', () => {
    const store = makeStore();
    store.loadDemo();
    const data = buildLedgerData(store.getState(), NOW);

    expect(data.relationship.networkSvg).toContain('viz-network');
    expect(data.relationship.trendSvg).toContain('viz-trend');
    expect(data.relationship.nodeCount).toBeGreaterThanOrEqual(7);
    expect(data.relationship.linkCount).toBeGreaterThanOrEqual(6);
    expect(data.relationship.ranking.length).toBeGreaterThanOrEqual(6);
    expect(renderLedger(data)).toContain('近 6 月收发趋势');
    expect(renderLedger(data)).toContain('关系健康排行');
  });

});

describe('XSS escaping', () => {
  it('escapes script tags in person names in the persons view', () => {
    const person = makePerson({ id: 'xss', name: '<script>alert(1)</script>' });
    const detail = buildPersonDetail(makeState([person]), person, NOW);
    const html = renderPersons({
      items: buildPersonList(makeState([person]), '', 'all', NOW),
      detail,
      query: '',
      identity: 'all',
      identities: ['朋友']
    });

    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>alert(1)</script>');
  });

  it('escapes event titles in ledger rows', () => {
    const person = makePerson({ id: 'xss2', name: '安全测试' });
    const state = makeState([person], [
      {
        id: 'e1',
        personId: 'xss2',
        type: 'gift_give',
        title: '<img src=x onerror=alert(1)>',
        time: NOW - 1000,
        weight: 1,
        note: '',
        amount: 500,
        dir: 'out',
        occasion: '生日'
      }
    ]);
    const detail = buildPersonDetail(state, person, NOW);

    expect(detail.entries[0]?.title).toContain('<img');
    const html = renderPersons({
      items: buildPersonList(state, '', 'all', NOW),
      detail,
      query: '',
      identity: 'all',
      identities: ['朋友']
    });

    expect(html).toContain('&lt;img');
    expect(html).not.toContain('<img src=x');
  });
});

describe('AI red lines', () => {
  it('renders the AI disabled empty state with a disabled provider form', () => {
    const store = makeStore();
    store.loadDemo();
    const html = renderAI(buildAIViewData(store));

    expect(html).toContain('AI 未启用');
    expect(html).toContain('data-act="ai-enable"');
    expect(html).toContain('data-act="ai-apikey"');
    expect(html).toContain('data-act="ai-preview" aria-label="生成发送前预览" disabled');
    expect(html).not.toContain('data-act="ai-disable"');
  });

  it('is disabled by default and never calls fetch through runAssistant', async () => {
    const store = makeStore();
    store.loadDemo();
    let fetchCalls = 0;
    const fetchImpl: FetchLike = async () => {
      fetchCalls += 1;
      return new Response('{}', { status: 200 });
    };

    const settings = defaultAISettings();
    expect(settings.enabled).toBe(false);

    const result = await runAssistant({
      app: store.getState(),
      settings,
      form: {
        kind: 'openai',
        baseUrl: 'https://api.example.com/v1',
        model: 'gpt-4o-mini',
        apiKey: 'sk-test-key',
        mock: false
      },
      personId: store.getState().persons[0]?.id,
      scene: '生日',
      note: '测试',
      fetchImpl,
      now: NOW
    });

    expect(result.status).toBe('disabled');
    expect(result.pipeline?.reason).toBe('disabled');
    expect(fetchCalls).toBe(0);
  });

  it('shows a redacted preview and keeps the name out when policy is off', () => {
    const store = makeStore();
    store.loadDemo();
    const person = store.getState().persons[0];
    const settings = defaultAISettings();
    const preview = previewAssistantContext(
      store.getState(),
      person,
      settings,
      { scene: '生日', note: '想送一本书' },
      NOW
    );

    expect(preview.user).toContain('称呼：对方');
    expect(preview.user).not.toContain(person.name);
    expect(preview.masked).toBe(0);
  });

  it('runs offline mock provider end-to-end and marks the result as AI output', async () => {
    const store = makeStore();
    store.loadDemo();
    const settings = { ...defaultAISettings(), enabled: true };

    const result = await runAssistant({
      app: store.getState(),
      settings,
      form: {
        kind: 'openai',
        baseUrl: 'https://api.example.com/v1',
        model: 'mock',
        apiKey: '',
        mock: true
      },
      personId: store.getState().persons[0]?.id,
      scene: '生日',
      note: '想送一本书',
      approved: true,
      now: NOW
    });

    expect(result.status).toBe('ok');
    expect(result.offline).toBe(false);
    expect(result.display?.variants.length).toBe(3);
    expect(result.display?.gift?.mid).toBe(500);
  });

  it('falls back to offline rule advice when a real provider has no key', async () => {
    const store = makeStore();
    store.loadDemo();
    const settings = { ...defaultAISettings(), enabled: true };

    const result = await runAssistant({
      app: store.getState(),
      settings,
      form: {
        kind: 'openai',
        baseUrl: 'https://api.example.com/v1',
        model: 'gpt-4o-mini',
        apiKey: '',
        mock: false
      },
      personId: store.getState().persons[0]?.id,
      scene: '生日',
      note: '',
      approved: true,
      now: NOW
    });

    expect(result.status).toBe('offline');
    expect(result.offline).toBe(true);
    expect(result.display?.variants.length).toBeGreaterThan(0);
    expect(result.message).toContain('离线建议');
  });

  it('requires a preview before a real send and keeps the key out of localStorage', async () => {
    const keyMemory = new Map<string, string>();
    const sessionKeyStore = {
      getItem: (key: string) => keyMemory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        keyMemory.set(key, value);
      },
      removeItem: (key: string) => {
        keyMemory.delete(key);
      }
    };
    const store = new StudioStore({
      adapter: createMemoryAdapter(),
      now: () => NOW,
      sessionKeyStore
    });
    store.loadDemo();
    store.enableAI();
    store.updateAIForm({ mock: true, apiKey: 'sk-session-only-secret' });

    expect(store.getAISettings().enabled).toBe(true);
    expect(store.getAIPreview()).toBeNull();
    expect(renderAI(buildAIViewData(store))).not.toContain('sk-session-only-secret');

    const first = await store.runAI();
    expect(first.status).toBe('preview');
    expect(store.getAIPreview()).not.toBeNull();

    const firstPersonId = store.getSelectedId();
    expect(firstPersonId).not.toBeNull();
    expect(
      store.addEvent({
        personId: firstPersonId as string,
        type: 'talk',
        title: '预览后新增往来',
        amount: 0,
        dir: 'none',
        occasion: '日常'
      })
    ).toBe(true);
    expect(store.getAIPreview()).toBeNull();

    const secondPerson = store.getState().persons[1];
    expect(secondPerson).toBeDefined();
    if (!secondPerson) throw new Error('demo data must include a second person');
    store.selectPerson(secondPerson.id);
    expect(store.getAIPreview()).toBeNull();

    const second = await store.runAI();
    expect(second.status).toBe('preview');
    expect(store.getAIPreview()).not.toBeNull();

    const third = await store.runAI();
    expect(third.status).toBe('ok');

    expect(keyMemory.get('eqworker.studio.ai.key')).toBe('sk-session-only-secret');
    expect(localStorage.getItem('eqworker.studio.ai.key')).toBeNull();
    expect(store.getStore().exportJSON()).not.toContain('sk-session-only-secret');
  });
});

describe('Studio shell integration', () => {
  it('keeps all navigation routes usable with an empty store', () => {
    document.body.innerHTML = '<div id="studio"></div>';
    const store = makeStore();
    const unmount = mountStudio(store, document);

    expect(document.querySelectorAll('[data-act="nav"]')).toHaveLength(4);
    expect(document.querySelector('[data-act="export"]')).not.toBeNull();
    expect(document.querySelector('[data-act="import-trigger"]')).not.toBeNull();

    document.querySelector<HTMLButtonElement>('[data-view="ledger"]')?.click();
    expect(document.querySelector('.ledger')).not.toBeNull();
    expect(document.querySelector('.ledger')?.textContent).toContain('还没有账本记录');

    document.querySelector<HTMLButtonElement>('[data-view="ai"]')?.click();
    expect(document.querySelector('.ai')).not.toBeNull();
    expect(document.querySelector('.ai')?.textContent).toContain('请先选择人脉');

    unmount();
    document.body.innerHTML = '';
  });

  it('loads demo data through delegated data-act clicks', () => {
    document.body.innerHTML = '<div id="studio"></div>';
    const store = makeStore();
    const unmount = mountStudio(store, document);

    expect(document.querySelector('.empty')).not.toBeNull();
    const demoButton = document.querySelector<HTMLButtonElement>('[data-act="load-demo"]');
    expect(demoButton).not.toBeNull();
    demoButton?.click();

    expect(store.getState().persons.length).toBeGreaterThanOrEqual(6);
    expect(document.querySelector('.overview')).not.toBeNull();
    expect(document.querySelector('.nav-item.active')).not.toBeNull();

    const navItems = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-act="nav"]'));
    expect(navItems.map((item) => item.querySelector('.nav-label')?.textContent?.trim())).toEqual(['仪表盘', '人脉', '账本与洞察', 'AI 助手']);
    expect(navItems.some((item) => item.dataset.view === 'insights')).toBe(false);

    const personsNav = document.querySelector<HTMLButtonElement>('[data-act="nav"][data-view="persons"]');
    personsNav?.click();
    expect(document.querySelector('.persons')).not.toBeNull();
    expect(document.querySelectorAll('.person-open').length).toBeGreaterThanOrEqual(6);

    const ledgerNav = document.querySelector<HTMLButtonElement>('[data-act="nav"][data-view="ledger"]');
    ledgerNav?.click();
    expect(document.querySelector('.ledger')).not.toBeNull();
    const relationshipInsights = document.querySelector<HTMLDetailsElement>('.relationship-insights');
    expect(relationshipInsights).not.toBeNull();
    expect(relationshipInsights?.open).toBe(false);
    const relationshipSummary = relationshipInsights?.querySelector('summary');
    expect(relationshipSummary?.textContent).toContain('关系洞察');
    relationshipSummary?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(relationshipInsights?.open).toBe(true);
    expect(relationshipInsights?.querySelector('[aria-label="关系网络图，节点为人，边为往来金额"]')).not.toBeNull();
    expect(document.querySelector('[data-view="insights"]')).toBeNull();

    const aiNav = document.querySelector<HTMLButtonElement>('[data-act="nav"][data-view="ai"]');
    aiNav?.click();
    expect(document.querySelector('.ai')).not.toBeNull();

    unmount();
    document.body.innerHTML = '';
  });
});
