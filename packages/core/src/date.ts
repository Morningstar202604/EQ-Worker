export const DAY = 86400000;

const LUNAR_INFO = [
  0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2,
  0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977,
  0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970,
  0x06566, 0x0d4a0, 0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950,
  0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x25d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557,
  0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5b0, 0x14573, 0x052b0, 0x0a9a8, 0x0e950, 0x06aa0,
  0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0,
  0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b6a0, 0x195a6,
  0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570,
  0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x5ac0, 0x0ab60, 0x096d5, 0x092e0,
  0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5,
  0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930,
  0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530,
  0x05aa0, 0x076a3, 0x096d0, 0x04afb, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45,
  0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0,
  0x14b63, 0x09370, 0x049f8, 0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06b20, 0x1a6c4, 0x0aae0,
  0x092e0, 0x0d2e3, 0x0c960, 0x0d557, 0x0d4a0, 0x0da50, 0x05d55, 0x056a0, 0x0a6d0, 0x055d4,
  0x052d0, 0x0a9b8, 0x0a950, 0x0b4a0, 0x0b6a6, 0x0ad50, 0x055a0, 0x0aba4, 0x0a5b0, 0x052b0,
  0x0b273, 0x06930, 0x07337, 0x06aa0, 0x0ad50, 0x14b55, 0x04b60, 0x0a570, 0x054e4, 0x0d160,
  0x0e968, 0x0d520, 0x0daa0, 0x16aa6, 0x056d0, 0x04ae0, 0x0a9d4, 0x0a4d0, 0x0d150, 0x0f252,
  0x0d520
];

function lYearDays(y: number): number {
  let s = 348;
  for (let i = 0x8000; i > 0x8; i >>= 1) s += LUNAR_INFO[y - 1900] & i ? 1 : 0;
  return s + lLeapDays(y);
}

function lLeapMonth(y: number): number {
  return LUNAR_INFO[y - 1900] & 0xf;
}

function lLeapDays(y: number): number {
  return lLeapMonth(y) ? (LUNAR_INFO[y - 1900] & 0x10000 ? 30 : 29) : 0;
}

function lMonthDays(y: number, m: number): number {
  return LUNAR_INFO[y - 1900] & (0x10000 >> m) ? 30 : 29;
}

export interface LunarDate {
  y: number;
  m: number;
  d: number;
  leap: boolean;
}

export function solarToLunar(d: Date): LunarDate {
  const base = Date.UTC(1900, 0, 31);
  let off = Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - base) / DAY);
  let y = 1900;
  while (off >= 0) {
    const yD = lYearDays(y);
    if (off < yD) break;
    off -= yD;
    y++;
  }
  const leap = lLeapMonth(y);
  let isLeap = false;
  let m = 1;
  while (m <= 12) {
    const mD = leap === m && isLeap ? lLeapDays(y) : lMonthDays(y, m);
    if (off < mD) break;
    off -= mD;
    if (leap === m && !isLeap) {
      isLeap = true;
    } else {
      m++;
      isLeap = false;
    }
  }
  return { y, m, d: off + 1, leap: isLeap };
}

const FESTIVALS = [
  { m: 1, d: 1, n: '春节' },
  { m: 5, d: 5, n: '端午节' },
  { m: 8, d: 15, n: '中秋节' }
];

export function upcomingFestival(now: number = Date.now()): { n: string; days: number } | null {
  const base = new Date(now);
  for (let i = 0; i <= 7; i++) {
    const lu = solarToLunar(new Date(base.getTime() + i * DAY));
    for (const f of FESTIVALS) if (lu.m === f.m && lu.d === f.d) return { n: f.n, days: i };
  }
  return null;
}

export function fmtDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function todayStr(now: number = Date.now()): string {
  return fmtDate(now);
}

export function toMMDD(v: unknown): string {
  if (!v) return '';
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? m[2] + '-' + m[3] : String(v);
}

export function toDateInput(v: unknown, now: number = Date.now()): string {
  if (!v) return '';
  const m = String(v).match(/^(\d{2})-(\d{2})$/);
  if (!m) return String(v);
  const y = new Date(now).getFullYear();
  const d = new Date(y, +m[1] - 1, +m[2]);
  if (d.getMonth() !== +m[1] - 1) return y + '-02-28';
  return y + '-' + m[1] + '-' + m[2];
}

export function daysUntil(birthday: unknown, now: number = Date.now()): number {
  const bd = toMMDD(birthday);
  const ref = new Date(now);
  const [m, d] = bd.split('-').map(Number);
  if (!m || !d) return 1e9;
  const today = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  let t = new Date(ref.getFullYear(), m - 1, d);
  if (t.getMonth() !== m - 1) t = new Date(ref.getFullYear(), m - 1, 28);
  if (t.getTime() < today.getTime()) {
    t = new Date(ref.getFullYear() + 1, m - 1, d);
    if (t.getMonth() !== m - 1) t = new Date(ref.getFullYear() + 1, m - 1, 28);
  }
  return Math.round((t.getTime() - today.getTime()) / DAY);
}

export function nextMMDD(mmdd: string, from: number = Date.now()): Date | null {
  const [m, d] = String(mmdd || '').split('-').map(Number);
  if (!m || !d) return null;
  const base = new Date(from);
  const today = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  let t = new Date(base.getFullYear(), m - 1, d);
  if (t.getMonth() !== m - 1) t = new Date(base.getFullYear(), m - 1, 28);
  if (t.getTime() < today.getTime()) {
    t = new Date(base.getFullYear() + 1, m - 1, d);
    if (t.getMonth() !== m - 1) t = new Date(base.getFullYear() + 1, m - 1, 28);
  }
  return t;
}
