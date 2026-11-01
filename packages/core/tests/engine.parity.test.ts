import { describe, expect, it } from 'vitest';
import { loadLegacy, type LegacyApi } from './legacy-loader';
import { buildActions } from '../src/actions';
import { buildAlerts, computePerson, getLevel, getSuggestion, getWisdom, overallMetrics, relationRead } from '../src/engine';
import { personHealth } from '../src/health';
import { buildICS, upcomingDates } from '../src/ics';
import { giftAdvice, ledgerInsights, ledgerTotals, personLedger } from '../src/ledger';
import { buildScripts, SCRIPT_SCENES } from '../src/scripts';
import { createEmptyState, normalizeSettings } from '../src/sanitize';
import type { AppState, CityTier, GiftTier, Person, PersonalEvent, Reminder } from '../src/types';

const NOW = new Date(2026, 9, 31, 12, 0, 0).getTime();
const DAY = 86400000;

interface Fixture {
  name: string;
  persons: Person[];
  events: PersonalEvent[];
  reminders?: Reminder[];
  progress?: Record<string, { best: number; times: number }>;
  settings?: { giftTier: GiftTier; cityTier: CityTier };
}

function person(id: string, name: string, extra: Partial<Person> = {}): Person {
  return {
    id, name, identity: '朋友', tags: [], birthday: '', anniversary: '',
    likes: '', taboos: '', note: '', adjust: 0, createdAt: NOW, ...extra
  };
}

function event(
  id: string,
  personId: string,
  type: PersonalEvent['type'],
  timeOffsetDays: number,
  extra: Partial<PersonalEvent> = {}
): PersonalEvent {
  return {
    id, personId, type, title: '', time: NOW - timeOffsetDays * DAY, weight: 7,
    note: '', amount: 0, dir: 'none', occasion: '', ...extra
  };
}

const FIXTURES: Fixture[] = [
  {
    name: '空数据',
    persons: [],
    events: []
  },
  {
    name: '单事件',
    persons: [person('p1', '张三', { adjust: 2 })],
    events: [event('e1', 'p1', 'meal', 0, { weight: 7, title: '火锅' })]
  },
  {
    name: '冲突负权重',
    persons: [person('p1', '李四', { adjust: 0 })],
    events: [
      event('e1', 'p1', 'conflict', 3, { weight: -10 }),
      event('e2', 'p1', 'talk', 10, { weight: 5 })
    ]
  },
  {
    name: '90 天半衰期',
    persons: [person('p1', '王五', { adjust: 0 })],
    events: [
      event('e1', 'p1', 'meal', 90, { weight: 7 }),
      event('e2', 'p1', 'help_them', 45, { weight: 3 })
    ]
  },
  {
    name: '账本混合',
    persons: [
      person('p1', '赵六', { identity: '领导', likes: '喝茶', taboos: '不喝酒', adjust: 0 }),
      person('p2', '钱七', { identity: '客户', adjust: -2 }),
      person('p3', '孙八', { identity: '家人', adjust: 0 })
    ],
    events: [
      event('e1', 'p1', 'gift_get', 5, { weight: 4, amount: 1200, dir: 'in', occasion: '婚礼' }),
      event('e2', 'p1', 'gift_give', 2, { weight: 4, amount: 500, dir: 'out', occasion: '生日' }),
      event('e3', 'p2', 'gift_give', 30, { weight: 4, amount: 800, dir: 'out', occasion: '乔迁' }),
      event('e4', 'p2', 'money', 12, { weight: 5, amount: 2000, dir: 'in', occasion: '其他' }),
      event('e5', 'p3', 'gift_get', 60, { weight: 4, amount: 600, dir: 'in', occasion: '节日' }),
      event('e6', 'p3', 'meal', 1, { weight: 7, amount: 300, dir: 'none', occasion: '日常' }),
      event('e7', 'p3', 'conflict', 20, { weight: -10 })
    ],
    reminders: [{ id: 'r1', personId: 'p1', content: '还礼', date: '2000-01-01', status: 'pending' }],
    progress: { wedding: { best: 90, times: 3 }, toast: { best: 70, times: 1 } }
  },
  {
    name: '生日今天',
    persons: [
      person('p1', '周九<&>', { birthday: '10-31', anniversary: '11-02', likes: '咖啡', adjust: 0 }),
      person('p2', '吴十', { birthday: '11-01', identity: '长辈', adjust: 0 })
    ],
    events: [event('e1', 'p2', 'greeting', 0, { weight: 3 })]
  }
];

function coreState(f: Fixture): AppState {
  return {
    ...createEmptyState(),
    persons: f.persons,
    events: f.events,
    reminders: f.reminders ?? [],
    progress: f.progress ?? {},
    settings: normalizeSettings(f.settings ?? { giftTier: 'standard', cityTier: '二线' })
  };
}

function loadLegacyState(f: Fixture): LegacyApi {
  const H = loadLegacy(NOW);
  H.state.persons = f.persons;
  H.state.events = f.events;
  H.state.reminders = f.reminders ?? [];
  H.state.progress = f.progress ?? {};
  H.state.settings = { giftTier: (f.settings ?? { giftTier: 'standard' }).giftTier, cityTier: (f.settings ?? { cityTier: '二线' }).cityTier };
  H.invalidateCache();
  return H;
}

function plain(v: unknown): unknown {
  return v === undefined ? undefined : JSON.parse(JSON.stringify(v));
}

function compare(actual: unknown, expected: unknown, path: string): void {
  if (typeof expected === 'number' && typeof actual === 'number') {
    const diff = Math.abs(actual - expected);
    if (diff > 1e-9) throw new Error(`${path}: core=${actual} legacy=${expected} diff=${diff}`);
    return;
  }
  if (expected === null || actual === null || typeof expected !== 'object' || typeof actual !== 'object') {
    expect(actual, path).toEqual(expected);
    return;
  }
  if (Array.isArray(expected)) {
    expect(Array.isArray(actual), path).toBe(true);
    const a = actual as unknown[];
    expect(a.length, `${path}.length`).toBe(expected.length);
    expected.forEach((v, i) => compare(a[i], v, `${path}[${i}]`));
    return;
  }
  const a = actual as Record<string, unknown>;
  const e = expected as Record<string, unknown>;
  expect(Object.keys(a).sort(), `${path} keys`).toEqual(Object.keys(e).sort());
  for (const k of Object.keys(e)) compare(a[k], e[k], `${path}.${k}`);
}

function assertParity(f: Fixture): void {
  const H = loadLegacyState(f);
  const S = coreState(f);

  expect(plain(overallMetrics(S, NOW)), `${f.name} overallMetrics`).toEqual(plain(H.overallMetrics()));

  const probes = f.persons.length ? f.persons : [person('probe', '探针')];
  for (const p of probes) {
    compare(plain(computePerson(S, p, NOW)), plain(H.computePerson(p)), `${f.name} computePerson(${p.id})`);
    compare(plain(personLedger(S, p.id)), plain(H.personLedger(p.id)), `${f.name} personLedger(${p.id})`);
    if (!f.persons.length) continue;
    compare(plain(personHealth(S, p, NOW)), plain(H.personHealth(p)), `${f.name} personHealth(${p.id})`);
    for (const opts of [undefined, { tier: 'generous', city: '一线' }, { tier: 'simple', city: '三线' }] as const) {
      compare(
        plain(giftAdvice(S, p.id, '婚礼', opts ? { ...opts } : {})),
        plain(H.giftAdvice(p.id, '婚礼', opts ? { ...opts } : undefined)),
        `${f.name} giftAdvice(${p.id},${JSON.stringify(opts ?? {})})`
      );
    }
  }
  if (!f.persons.length) {
    compare(plain(giftAdvice(S, 'missing', '婚礼', {})), plain(H.giftAdvice('missing', '婚礼', undefined)), `${f.name} giftAdvice(missing)`);
  }

  for (const limit of [undefined, 3, 6, 10]) {
    compare(
      plain(buildActions(S, limit, NOW)),
      plain(H.buildActions(limit)),
      `${f.name} buildActions(${limit})`
    );
  }

  compare(plain(ledgerTotals(S)), plain(H.ledgerTotals()), `${f.name} ledgerTotals`);
  compare(plain(ledgerInsights(S, NOW)), plain(H.ledgerInsights()), `${f.name} ledgerInsights`);
  compare(plain(getWisdom(S)), plain(H.getWisdom()), `${f.name} getWisdom`);
  compare(plain(getLevel(getWisdom(S))), plain(H.getLevel(H.getWisdom())), `${f.name} getLevel`);
  compare(plain(buildAlerts(S, NOW)), plain(H.buildAlerts()), `${f.name} buildAlerts`);
  compare(plain(buildICS(S, NOW)), plain(H.buildICS()), `${f.name} buildICS`);
  compare(plain(upcomingDates(S, 365, NOW)), plain(H.upcomingDates(365)), `${f.name} upcomingDates`);

  for (const p of probes) {
    if (!f.persons.length) continue;
    compare(plain(getSuggestion(S, p, NOW)), plain(H.getSuggestion(p)), `${f.name} getSuggestion(${p.id})`);
    compare(plain(relationRead(S, p, NOW)), plain(H.relationRead(p)), `${f.name} relationRead(${p.id})`);
  }
  for (const scene of SCRIPT_SCENES) {
    compare(
      plain(buildScripts(S, scene.id, f.persons[0]?.id ?? '', '最近') ),
      plain(H.buildScripts(scene.id, f.persons[0]?.id ?? '', '最近')),
      `${f.name} buildScripts(${scene.id})`
    );
  }
}

describe('S2 parity: core vs legacy _app_dev.js', () => {
  for (const f of FIXTURES) {
    it(`fixture「${f.name}」九个函数输出完全一致`, () => {
      assertParity(f);
    });
  }
});
