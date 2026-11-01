import { describe, expect, it } from 'vitest';
import { buildActions } from '../src/actions';
import { createEmptyState } from '../src/sanitize';
import type { AppState, Person, PersonalEvent, Reminder } from '../src/types';

const NOW = new Date(2026, 9, 31, 12).getTime();

function person(id: string, name: string, extra: Partial<Person> = {}): Person {
  return {
    id, name, identity: '朋友', tags: [], birthday: '', anniversary: '', likes: '', taboos: '', note: '', adjust: 0, createdAt: NOW, ...extra
  };
}

function event(id: string, personId: string, type: PersonalEvent['type'], time: number, extra: Partial<PersonalEvent> = {}): PersonalEvent {
  return { id, personId, type, title: '', time, weight: 7, note: '', amount: 0, dir: 'none', occasion: '', ...extra };
}

function reminder(id: string, personId: string, date: string, status: 'pending' | 'done' = 'pending'): Reminder {
  return { id, personId, content: '还人情', date, status };
}

function state(persons: Person[], events: PersonalEvent[], reminders: Reminder[] = []): AppState {
  return { ...createEmptyState(), persons, events, reminders };
}

describe('buildActions', () => {
  it('生日提醒优先于普通跟进，且同一人只出一条', () => {
    const p = person('p1', '张三', { birthday: '11-01' });
    const other = person('p2', '李四', { birthday: '11-05' });
    const acts = buildActions(
      state([p, other], [event('e1', 'p1', 'help_them', NOW - 5 * 86400000), event('e2', 'p2', 'talk', NOW)]),
      6,
      NOW
    );
    const firstP1 = acts.findIndex((a) => a.personId === 'p1');
    const firstP2 = acts.findIndex((a) => a.personId === 'p2');
    expect(acts.filter((a) => a.personId === 'p1')).toHaveLength(1);
    expect(acts[firstP1].key).toBe('bday:p1');
    expect(firstP1).toBe(0);
    expect(firstP1).toBeLessThan(firstP2);
  });

  it('同时满足生日与欠人情时只保留生日一条', () => {
    const p = person('p1', '张三', { birthday: '10-31' });
    const acts = buildActions(state([p], [event('e1', 'p1', 'help_them', NOW, { weight: 6 })]), 6, NOW);
    expect(acts.filter((a) => a.personId === 'p1')).toHaveLength(1);
    expect(acts[0].key).toBe('bday:p1');
    expect(acts[0].primary.act).toBe('scriptModal');
  });

  it('逾期待办排在最前，且按钮为完成', () => {
    const p = person('p1', '张三');
    const acts = buildActions(state([p], [], [reminder('r1', 'p1', '2000-01-01')]), 6, NOW);
    expect(acts[0].key).toBe('todo:r1');
    expect(acts[0].primary.act).toBe('quickDone');
  });

  it('未到期待办不出现', () => {
    const p = person('p1', '张三');
    const acts = buildActions(state([p], [], [reminder('r1', 'p1', '2026-12-01')]), 6, NOW);
    expect(acts.some((a) => a.key === 'todo:r1')).toBe(false);
  });

  it('已完成的待办不出现', () => {
    const p = person('p1', '张三');
    const acts = buildActions(state([p], [], [reminder('r1', 'p1', '2000-01-01', 'done')]), 6, NOW);
    expect(acts.some((a) => a.key === 'todo:r1')).toBe(false);
  });

  it('久未往来会生成破冰行动', () => {
    const p = person('p1', '张三');
    const acts = buildActions(state([p], [event('e1', 'p1', 'meal', NOW - 70 * 86400000)]), 6, NOW);
    expect(acts.some((a) => a.key === 'stale:p1')).toBe(true);
  });

  it('limit 限制返回条数', () => {
    const persons = Array.from({ length: 8 }, (_, i) => person(`p${i}`, `人${i}`));
    const reminders = persons.map((p, i) => reminder(`r${i}`, p.id, '2000-01-01'));
    const acts = buildActions(state(persons, [], reminders), 3, NOW);
    expect(acts).toHaveLength(3);
  });
});
