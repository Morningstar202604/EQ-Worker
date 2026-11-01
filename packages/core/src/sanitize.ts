import { EVENT_TYPES, SCHEMA_VERSION, DEFAULT_SETTINGS } from './constants';
import type {
  AppState,
  CityTier,
  Dir,
  EventType,
  GiftTier,
  PersonalEvent,
  Person,
  ProgressEntry,
  Reminder,
  SanitizeResult,
  Settings,
  Streak
} from './types';

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v));
}

export function avg(arr: number[]): number {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

export function esc(s: unknown): string {
  return String(s == null ? '' : s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string
  );
}

type Raw = Record<string, unknown>;

function isObj(x: unknown): x is Raw {
  return !!x && typeof x === 'object' && !Array.isArray(x);
}

function num(x: unknown, def: number): number {
  return typeof x === 'number' && isFinite(x) ? x : def;
}

function str(x: unknown, max: number): string {
  return typeof x === 'string' ? x.slice(0, max) : '';
}

function mmdd(x: unknown): string {
  const s = str(x, 10);
  const m = s.match(/^(?:\d{4}-)?(\d{2})-(\d{2})$/);
  return m ? m[1] + '-' + m[2] : '';
}

function fixWeight(type: EventType, w: unknown): number {
  const t = EVENT_TYPES[type] || EVENT_TYPES.other;
  let n = num(w, t.dHeat);
  if (t.dHeat < 0 && n > 0) n = -n;
  return n;
}

function fixDir(type: EventType, dir: unknown, amount: number): Dir {
  if (!(amount > 0)) return 'none';
  if (dir === 'in' || dir === 'out') return dir;
  if (type === 'gift_get') return 'in';
  if (type === 'gift_give') return 'out';
  if (type === 'money') return 'in';
  return 'none';
}

export function normalizeSettings(raw: unknown): Settings {
  const r = isObj(raw) ? raw : {};
  const aiRaw = isObj(r.ai) ? r.ai : {};
  const giftTier: GiftTier = ['simple', 'standard', 'generous'].includes(r.giftTier as string)
    ? (r.giftTier as GiftTier)
    : DEFAULT_SETTINGS.giftTier;
  const cityTier: CityTier = ['三线', '二线', '一线'].includes(r.cityTier as string)
    ? (r.cityTier as CityTier)
    : DEFAULT_SETTINGS.cityTier;
  const temperature = num(aiRaw.temperature, DEFAULT_SETTINGS.ai.temperature);
  return {
    giftTier,
    cityTier,
    ai: {
      enabled: aiRaw.enabled === true,
      providerId: str(aiRaw.providerId, 40),
      model: str(aiRaw.model, 80),
      baseUrl: str(aiRaw.baseUrl, 300),
      temperature: clamp(temperature, 0, 2)
    }
  };
}

export function createEmptyState(): AppState {
  return {
    persons: [],
    events: [],
    reminders: [],
    progress: {},
    streak: { n: 0, last: '' },
    settings: normalizeSettings(null),
    meta: { schema: SCHEMA_VERSION, updatedAt: Date.now() },
    lastEventId: null,
    filter: '',
    identity: 'all',
    sortBy: 'heat',
    trainDiff: '全部',
    ledgerFilter: 'all'
  };
}

export function sanitizeImport(d: Raw): SanitizeResult {
  const warn: string[] = [];

  let rawPersons: unknown[] = Array.isArray(d.persons) ? d.persons : [];
  const nP = rawPersons.length;
  const persons: Person[] = rawPersons
    .filter((p): p is Raw => isObj(p) && typeof p.name === 'string' && !!p.name.trim())
    .map((p) => ({
      id: typeof p.id === 'string' && p.id ? p.id : uid(),
      name: str(p.name, 60),
      identity: str(p.identity, 40),
      tags: Array.isArray(p.tags)
        ? (p.tags as unknown[]).filter((t): t is string => typeof t === 'string').map((t) => t.slice(0, 20)).slice(0, 10)
        : [],
      birthday: mmdd(p.birthday),
      anniversary: mmdd(p.anniversary),
      likes: str(p.likes, 200),
      taboos: str(p.taboos, 200),
      note: str(p.note, 500),
      adjust: num(p.adjust, 0),
      createdAt: num(p.createdAt, Date.now())
    }));
  if (nP !== persons.length) warn.push('人脉 ' + (nP - persons.length) + ' 条');

  const rawEvents: unknown[] = Array.isArray(d.events) ? d.events : [];
  const nE = rawEvents.length;
  const events: PersonalEvent[] = rawEvents
    .filter((e): e is Raw => isObj(e) && typeof e.type === 'string' && num(e.time, 0) > 0)
    .map((e) => {
      const amount = clamp(num(e.amount, 0), 0, 10000000);
      const type = e.type as EventType;
      return {
        id: typeof e.id === 'string' && e.id ? e.id : uid(),
        personId: str(e.personId, 40),
        type,
        title: str(e.title, 80),
        time: num(e.time, Date.now()),
        weight: fixWeight(type, e.weight),
        note: str(e.note, 500),
        amount,
        dir: fixDir(type, e.dir, amount),
        occasion: str(e.occasion, 20)
      };
    });
  if (nE !== events.length) warn.push('往来 ' + (nE - events.length) + ' 条');

  const reminders: Reminder[] = Array.isArray(d.reminders)
    ? (d.reminders as unknown[]).filter(isObj).map((r) => ({
        id: typeof r.id === 'string' && r.id ? r.id : uid(),
        personId: str(r.personId, 40),
        content: str(r.content, 200),
        date: str(r.date, 20),
        status: r.status === 'done' ? 'done' : 'pending'
      }))
    : [];

  const rawProg = isObj(d.progress) ? d.progress : {};
  const progress: Record<string, ProgressEntry> = {};
  for (const k of Object.keys(rawProg)) {
    const v = rawProg[k];
    if (isObj(v)) progress[k] = { best: num(v.best, 0), times: num(v.times, 0) };
  }

  const st = isObj(d.streak) ? d.streak : {};
  const streak: Streak = { n: num(st.n, 0), last: str(st.last, 20) };

  return {
    persons,
    events,
    reminders,
    progress,
    streak,
    settings: normalizeSettings(d.settings),
    warn,
    schemaMismatch: typeof d.schema === 'number' && d.schema !== SCHEMA_VERSION
  };
}
