import { describe, expect, it } from 'vitest';
import { fmtMoneyCN, ledgerCsv, createEmptyState, uid } from '../packages/core/src/index';
import type { AppState, PersonalEvent, Person } from '../packages/core/src/index';

function person(id: string, name: string, identity = '朋友'): Person {
  return {
    id, name, identity, tags: [], birthday: '', anniversary: '',
    likes: '', taboos: '', note: '', adjust: 0, createdAt: 0
  };
}

function event(personId: string, over: Partial<PersonalEvent>): PersonalEvent {
  return {
    id: uid(), personId, type: 'gift_give', title: '', time: 0, weight: 0,
    note: '', amount: 0, dir: 'out', occasion: '', ...over
  };
}

describe('fmtMoneyCN 人民币大写', () => {
  it('常见礼金档位', () => {
    expect(fmtMoneyCN(0)).toBe('零元整');
    expect(fmtMoneyCN(100)).toBe('壹佰元整');
    expect(fmtMoneyCN(800)).toBe('捌佰元整');
    expect(fmtMoneyCN(1200)).toBe('壹仟贰佰元整');
    expect(fmtMoneyCN(1050)).toBe('壹仟零伍拾元整');
    expect(fmtMoneyCN(10000)).toBe('壹万元整');
  });

  it('组间零与大数', () => {
    // 万组为空、个组非零：亿/万与个之间要补零
    expect(fmtMoneyCN(10001)).toBe('壹万零壹元整');
    expect(fmtMoneyCN(1000500)).toBe('壹佰万零伍佰元整');
    expect(fmtMoneyCN(100000001)).toBe('壹亿零壹元整');
    expect(fmtMoneyCN(1234567)).toBe('壹佰贰拾叁万肆仟伍佰陆拾柒元整');
  });

  it('角分与负数容错', () => {
    expect(fmtMoneyCN(0.5)).toBe('伍角');
    expect(fmtMoneyCN(12.34)).toBe('壹拾贰元叁角肆分');
    expect(fmtMoneyCN(1.05)).toBe('壹元零伍分');
    expect(fmtMoneyCN(-800)).toBe('负捌佰元整');
    expect(fmtMoneyCN(Infinity)).toBe('零元整');
    expect(fmtMoneyCN('abc')).toBe('零元整');
  });
});

describe('ledgerCsv 往来明细礼簿', () => {
  it('输出表头、按时间排序、方向与大写齐全', () => {
    const s = createEmptyState();
    const zhang = person('z1', '张三');
    const li = person('l1', '李四', '同事');
    s.persons = [zhang, li];
    s.events = [
      event('z1', { time: 1700000000000, amount: 800, occasion: '婚礼', dir: 'out', type: 'gift_give', note: '含 "礼" 字,带逗号' }),
      event('l1', { time: 1600000000000, amount: 500, occasion: '满月', dir: 'in', type: 'gift_get' })
    ];
    const csv = ledgerCsv(s);
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe('日期,姓名,身份,类型,场合,方向,金额(元),金额大写,备注');
    // 时间升序：李四（更早）在前
    expect(lines[1]).toContain('李四');
    expect(lines[1]).toContain('收到');
    expect(lines[1]).toContain('伍佰元整');
    // 张三：备注含逗号与引号，必须被转义
    expect(lines[2]).toContain('送出');
    expect(lines[2]).toContain('捌佰元整');
    expect(lines[2]).toContain('"含 ""礼"" 字,带逗号"');
  });

  it('未来事件不出现；金额为 0 的往来不输出大写', () => {
    const s = createEmptyState();
    s.persons = [person('p1', '王五')];
    const now = 1700000000000;
    s.events = [
      event('p1', { time: now + 86400000, amount: 999, occasion: '婚礼' }),
      event('p1', { time: now - 1000, type: 'meal', amount: 0 })
    ];
    const csv = ledgerCsv(s, now);
    expect(csv).not.toContain('999');
    const rows = csv.split('\r\n').slice(1);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toContain('饭局/聚会');
  });

  it('孤儿事件显示「（已删除）」而不是崩溃', () => {
    const s = createEmptyState();
    s.events = [event('ghost', { time: 1600000000000, amount: 200, dir: 'in', type: 'gift_get' })];
    const csv = ledgerCsv(s);
    expect(csv).toContain('（已删除）');
  });
});
