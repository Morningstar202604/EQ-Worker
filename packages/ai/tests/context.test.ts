import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CONTEXT_POLICY,
  buildPersonContext,
  redactPreview,
  type PersonInput
} from '../src/index';

const person: PersonInput = {
  id: 'p-1',
  name: '张三',
  identity: '同事',
  birthday: '1990-10-03',
  note: '上次借钱没还，别主动提',
  likes: '喝普洱',
  taboos: '忌辣',
  events: [
    { type: '婚礼随礼', amount: 600, time: 1_700_000_000_000 },
    { type: '生日祝福', amount: 88 }
  ]
};

describe('default context policy', () => {
  it('is closed by default and keeps only relationship and event signals', () => {
    expect(DEFAULT_CONTEXT_POLICY).toEqual({
      name: false,
      birthday: false,
      notes: false,
      likes: false,
      taboos: false,
      events: true
    });
  });

  it('never leaks raw name, birthday, notes, likes or taboos into the payload', () => {
    const context = buildPersonContext(person, DEFAULT_CONTEXT_POLICY, {
      now: new Date(2026, 9, 31)
    });
    const payload = `${context.system}\n${context.user}`;

    expect(payload).not.toContain('张三');
    expect(payload).not.toContain('1990-10-03');
    expect(payload).not.toContain('10-03');
    expect(payload).not.toContain('上次借钱没还');
    expect(payload).not.toContain('喝普洱');
    expect(payload).not.toContain('忌辣');
    expect(payload).toContain('关系：同事');
    expect(payload).toContain('称呼：对方');
    expect(payload).toContain('近7天内有生日：');
    expect(payload).toContain('婚礼随礼');
    expect(payload).toContain('500-1000元');
    expect(payload).toContain('200元以下');
  });

  it('lists which fields were redacted', () => {
    const context = buildPersonContext(person, DEFAULT_CONTEXT_POLICY, {
      now: new Date(2026, 9, 31)
    });

    expect(context.redactions).toEqual(['name', 'birthday', 'notes', 'likes', 'taboos']);
    expect(context.fields).toContain('relation');
    expect(context.fields).toContain('birthdayWindow');
    expect(context.fields).toContain('eventTypes');
    expect(context.fields).toContain('amountRange');
  });

  it('emits the raw birthday only when the birthday flag is on', () => {
    const context = buildPersonContext(person, { ...DEFAULT_CONTEXT_POLICY, birthday: true }, {
      now: new Date(2026, 9, 31)
    });

    expect(context.user).toContain('生日：10-03');
    expect(context.fields).toContain('birthday');
    expect(context.redactions).not.toContain('birthday');
  });

  it('emits the raw name only when the name flag is on', () => {
    const off = buildPersonContext(person, DEFAULT_CONTEXT_POLICY, { now: new Date(2026, 9, 31) });
    const on = buildPersonContext(person, { ...DEFAULT_CONTEXT_POLICY, name: true }, {
      now: new Date(2026, 9, 31)
    });

    expect(off.user).not.toContain('张三');
    expect(on.user).toContain('称呼：张三');
    expect(on.redactions).not.toContain('name');
  });

  it('accepts allowName as an alias for the explicit name opt-in', () => {
    const context = buildPersonContext(person, { allowName: true }, { now: new Date(2026, 9, 31) });

    expect(context.user).toContain('张三');
    expect(context.fields).toContain('name');
  });

  it('reports birthday within seven days without exposing the date', () => {
    const context = buildPersonContext(
      { ...person, birthday: '11-02' },
      DEFAULT_CONTEXT_POLICY,
      { now: new Date(2026, 9, 31) }
    );

    expect(context.user).toContain('近7天内有生日：是');
    expect(context.user).not.toContain('11-02');
  });

  it('reports no birthday window when the birthday is far away', () => {
    const context = buildPersonContext(
      { ...person, birthday: '2027-01-20' },
      DEFAULT_CONTEXT_POLICY,
      { now: new Date(2026, 9, 31) }
    );

    expect(context.user).toContain('近7天内有生日：否');
    expect(context.user).not.toContain('01-20');
  });
});

describe('redactPreview', () => {
  it('masks api keys before the user approves sending', () => {
    const preview = redactPreview({
      system: 'system',
      user: 'key: sk-abcdef123456 and Authorization: Bearer abcdef.token.value',
      fields: ['relation'],
      redactions: ['name']
    });

    expect(preview.user).not.toContain('sk-abcdef123456');
    expect(preview.user).not.toContain('abcdef.token.value');
    expect(preview.masked).toBeGreaterThanOrEqual(2);
    expect(preview.fields).toEqual(['relation']);
    expect(preview.redactions).toEqual(['name']);
  });

  it('leaves clean payloads untouched', () => {
    const preview = redactPreview({ system: 'a', user: 'b' });

    expect(preview).toEqual({
      system: 'a',
      user: 'b',
      fields: [],
      redactions: [],
      masked: 0
    });
  });
});
