import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

function resolveLegacyPath(): string {
  const candidates = [
    path.resolve(process.cwd(), '_app_dev.js'),
    path.resolve(process.cwd(), '..', '_app_dev.js'),
    path.resolve(process.cwd(), '..', '..', '_app_dev.js')
  ];
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) throw new Error(`未找到 _app_dev.js（从 ${process.cwd()} 起找）`);
  return found;
}

const LEGACY_SRC = resolveLegacyPath();

export interface LegacyState {
  persons: unknown[];
  events: unknown[];
  reminders: unknown[];
  progress: Record<string, { best: number; times: number }>;
  streak: { n: number; last: string };
  settings: { giftTier: string; cityTier: string };
}

export interface LegacyApi {
  state: LegacyState;
  computePerson(p: unknown): Record<string, unknown>;
  personLedger(personId: string): Record<string, unknown>;
  personHealth(p: unknown): Record<string, unknown>;
  overallMetrics(): Record<string, unknown> | null;
  giftAdvice(personId: string, occasion: string, opts?: unknown): Record<string, unknown>;
  buildActions(limit?: number): Array<Record<string, unknown>>;
  buildAlerts(): Array<Record<string, unknown>>;
  getSuggestion(p: unknown): string;
  relationRead(p: unknown): string;
  buildScripts(sceneId: string, personId: string, context: string): Record<string, unknown>;
  buildICS(): string;
  upcomingDates(days?: number): Array<Record<string, unknown>>;
  ledgerTotals(): Record<string, number>;
  ledgerInsights(): Record<string, unknown>;
  getWisdom(): number;
  getLevel(w: number): Record<string, unknown>;
  invalidateCache(): void;
}

function fixedDate(now: number): DateConstructor {
  const RealDate = Date;
  return new Proxy(RealDate, {
    construct(target, args) {
      return Reflect.construct(target, args.length ? args : [now]);
    },
    get(target, prop, receiver) {
      if (prop === 'now') return () => now;
      return Reflect.get(target, prop, receiver);
    }
  }) as DateConstructor;
}

function stubEl(): Record<string, unknown> {
  const el = (): Record<string, unknown> => ({
    innerHTML: '', textContent: '', value: '', style: {}, dataset: {}, children: [],
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    appendChild() {}, removeChild() {}, addEventListener() {}, removeEventListener() {},
    setAttribute() {}, getAttribute() { return null; }, focus() {}, click() {}, remove() {},
    querySelector() { return el(); }, querySelectorAll() { return []; },
    getBoundingClientRect() { return { width: 300, height: 200, top: 0, left: 0 }; },
    insertAdjacentHTML() {}, closest() { return null; }, contains() { return false; }
  });
  return el();
}

export function loadLegacy(now: number): LegacyApi {
  let src = fs.readFileSync(LEGACY_SRC, 'utf8');
  const idx = src.lastIndexOf('\ninit();');
  if (idx >= 0) src = src.slice(0, idx) + '\n';
  src += `
;globalThis.__h5 = { state, computePerson, personLedger, personHealth, overallMetrics,
  giftAdvice, buildActions, buildAlerts, getSuggestion, relationRead, buildScripts,
  buildICS, upcomingDates, ledgerTotals, ledgerInsights, getWisdom, getLevel, invalidateCache };`;

  const mem = new Map<string, string>();
  const sandbox: Record<string, unknown> = {
    console,
    Date: fixedDate(now),
    navigator: { userAgent: 'vitest' },
    location: { protocol: 'https:', hostname: 'example.com', href: 'https://example.com/' },
    localStorage: {
      getItem: (k: string) => (mem.has(k) ? (mem.get(k) as string) : null),
      setItem: (k: string, v: string) => mem.set(k, String(v)),
      removeItem: (k: string) => mem.delete(k),
      clear: () => mem.clear()
    },
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    requestAnimationFrame: (cb: () => void) => setTimeout(cb, 0),
    Blob: class {},
    URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} },
    FileReader: class {},
    echarts: { init: () => ({ setOption() {}, resize() {}, dispose() {}, on() {} }) }
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.document = {
    documentElement: stubEl(),
    body: stubEl(),
    head: stubEl(),
    querySelector: () => stubEl(),
    querySelectorAll: () => [],
    getElementById: () => stubEl(),
    createElement: () => stubEl(),
    addEventListener() {},
    removeEventListener() {}
  };
  sandbox.addEventListener = () => {};
  sandbox.removeEventListener = () => {};

  const ctx = vm.createContext(sandbox);
  vm.runInContext(src, ctx, { filename: '_app_dev.js' });
  return (sandbox as { __h5: LegacyApi }).__h5;
}
