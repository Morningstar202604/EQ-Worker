import { DAY, daysUntil, nextMMDD } from './date';
import type { AppState, UpcomingDate } from './types';

function icsEscape(s: unknown): string {
  return String(s == null ? '' : s)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function icsDate(d: Date): string {
  return d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
}

export function buildICS(state: AppState, now: number = Date.now()): string {
  const out = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//EQ-Worker//CN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:EQ-Worker 重要日子'
  ];
  const stamp = new Date(now).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const addYearly = (uid: string, mmdd: string, summary: string, desc: string) => {
    const d = nextMMDD(mmdd, now);
    if (!d) return;
    out.push(
      'BEGIN:VEVENT',
      `UID:${uid}@eq-worker`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${icsDate(d)}`,
      'RRULE:FREQ=YEARLY',
      `SUMMARY:${icsEscape(summary)}`,
      `DESCRIPTION:${icsEscape(desc)}`,
      'TRANSP:TRANSPARENT',
      'BEGIN:VALARM',
      'TRIGGER:-P1D',
      'ACTION:DISPLAY',
      `DESCRIPTION:${icsEscape(summary + ' 提醒')}`,
      'END:VALARM',
      'END:VEVENT'
    );
  };
  for (const p of state.persons) {
    if (p.birthday) {
      addYearly('birthday-' + p.id, p.birthday, '生日 · ' + p.name, `EQ-Worker 生日提醒：${p.name}${p.likes ? '，喜欢：' + p.likes : ''}`);
    }
    if (p.anniversary) {
      addYearly('anniversary-' + p.id, p.anniversary, '纪念日 · ' + p.name, `EQ-Worker 纪念日提醒：${p.name}`);
    }
  }
  for (const r of state.reminders) {
    if (r.status !== 'pending' || !/^\d{4}-\d{2}-\d{2}$/.test(r.date || '')) continue;
    const p = state.persons.find((x) => x.id === r.personId);
    out.push(
      'BEGIN:VEVENT',
      `UID:todo-${r.id}@eq-worker`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${r.date.replace(/-/g, '')}`,
      `SUMMARY:${icsEscape(r.content)}`,
      `DESCRIPTION:${icsEscape('EQ-Worker 待办' + (p ? ' · ' + p.name : ''))}`,
      'BEGIN:VALARM',
      'TRIGGER:-P0DT9H',
      'ACTION:DISPLAY',
      `DESCRIPTION:${icsEscape(r.content)}`,
      'END:VALARM',
      'END:VEVENT'
    );
  }
  out.push('END:VCALENDAR');
  return out
    .map((line) => {
      if (line.length <= 74) return line;
      let s = line;
      const chunks: string[] = [];
      while (s.length > 74) {
        chunks.push(s.slice(0, 74));
        s = ' ' + s.slice(74);
      }
      chunks.push(s);
      return chunks.join('\r\n');
    })
    .join('\r\n');
}

export function upcomingDates(state: AppState, days?: number, now: number = Date.now()): UpcomingDate[] {
  const lim = days || 30;
  const out: UpcomingDate[] = [];
  for (const p of state.persons) {
    if (p.birthday) {
      const d = daysUntil(p.birthday, now);
      if (d >= 0 && d <= lim) {
        out.push({ kind: '生日', name: p.name, days: d, personId: p.id, date: p.birthday });
      }
    }
    if (p.anniversary) {
      const d = daysUntil(p.anniversary, now);
      if (d >= 0 && d <= lim) {
        out.push({ kind: '纪念日', name: p.name, days: d, personId: p.id, date: p.anniversary });
      }
    }
  }
  for (const r of state.reminders) {
    if (r.status !== 'pending' || !/^\d{4}-\d{2}-\d{2}$/.test(r.date || '')) continue;
    const t = new Date(r.date + 'T00:00:00').getTime();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const d = Math.round((t - today.getTime()) / DAY);
    if (d >= 0 && d <= lim) {
      const p = state.persons.find((x) => x.id === r.personId);
      out.push({ kind: '待办', name: r.content, days: d, personId: r.personId, date: r.date, extra: p ? p.name : '' });
    }
  }
  return out.sort((a, b) => a.days - b.days);
}
