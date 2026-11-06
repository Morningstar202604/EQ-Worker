import { describe, expect, it } from 'vitest';
import { giftAdvice, ledgerInsights, ledgerTotals, niceAmount, personLedger, settlePrefill } from '../src/ledger';
import { createEmptyState } from '../src/sanitize';
import type { AppState, Person, PersonalEvent } from '../src/types';

const NOW = new Date(2026, 9, 31, 12).getTime();

function person(id: string, name: string, identity = '朋友'): Person {
  return {
    id, name, identity, tags: [], birthday: '', anniversary: '', likes: '', taboos: '', note: '', adjust: 0, createdAt: NOW
  };
}

function event(id: string, personId: string, type: PersonalEvent['type'], amount: number, time = NOW, extra: Partial<PersonalEvent> = {}): PersonalEvent {
  return {
    id, personId, type, title: '', time, weight: 7, note: '', amount, dir: 'none', occasion: '', ...extra
  };
}

function stateWith(persons: Person[], events: PersonalEvent[]): AppState {
  return { ...createEmptyState(), persons, events };
}

describe('ledger', () => {
  it.each(['__proto__', 'constructor', 'toString'])('特殊场合名称 %s 正确累计金额', (occasion) => {
    const state = stateWith([person('p1', '张三')], [event('e1', 'p1', 'gift_give', 500, NOW, { dir: 'out', occasion })]);
    expect(ledgerInsights(state, NOW).topOccasion).toBe(occasion);
    expect(ledgerInsights(state, NOW).topOccasionAmount).toBe(500);
  });
  it('收礼 - 送礼 = 净额，正数代表我欠对方', () => {
    const s = stateWith([person('p1', '张三')], [
      event('e1', 'p1', 'gift_give', 500, NOW, { dir: 'out' }),
      event('e2', 'p1', 'gift_get', 1200, NOW, { dir: 'in' }),
      event('e3', 'p1', 'meal', 300, NOW, { dir: 'none' })
    ]);
    const l = personLedger(s, 'p1');
    expect(l.given).toBe(500);
    expect(l.received).toBe(1200);
    expect(l.net).toBe(700);
    expect(l.status).toBe('owe');
    expect(l.givenCount).toBe(1);
    expect(l.receivedCount).toBe(1);
    expect(ledgerTotals(s).owe).toBe(700);
    expect(ledgerTotals(s).oweCount).toBe(1);
  });

  it('净额为负时状态是 due，对方欠我', () => {
    const s = stateWith([person('p1', '张三')], [event('e1', 'p1', 'gift_give', 800, NOW, { dir: 'out' })]);
    const l = personLedger(s, 'p1');
    expect(l.net).toBe(-800);
    expect(l.status).toBe('due');
    expect(ledgerTotals(s).due).toBe(800);
  });

  it('金额 0 的往来永远不入账', () => {
    const s = stateWith([person('p1', '张三')], [
      event('e1', 'p1', 'gift_get', 0, NOW, { dir: 'none' }),
      event('e2', 'p1', 'gift_give', 0, NOW, { dir: 'none' })
    ]);
    const l = personLedger(s, 'p1');
    expect(l.given).toBe(0);
    expect(l.received).toBe(0);
    expect(l.net).toBe(0);
    expect(l.status).toBe('clear');
    expect(l.givenCount + l.receivedCount).toBe(0);
  });

  it('旧数据缺 dir 时按类型推断方向', () => {
    const s = stateWith([person('p1', '张三')], [
      event('e1', 'p1', 'gift_get', 500, NOW, { dir: 'none' }),
      event('e2', 'p1', 'gift_give', 300, NOW, { dir: 'none' })
    ]);
    expect(personLedger(s, 'p1').net).toBe(200);
  });

  it('niceAmount 取常见礼金整数', () => {
    expect(niceAmount(873)).toBe(800);
    expect(niceAmount(1030)).toBe(1000);
    expect(niceAmount(1470)).toBe(1500);
    expect(niceAmount(0)).toBe(0);
    expect(niceAmount(10001)).toBe(10000);
    expect(niceAmount(12800)).toBe(13000);
    expect(niceAmount(NaN)).toBe(0);
  });

  it('giftAdvice：领导婚礼得体档约 1000，三档递增', () => {
    const s = stateWith([person('p1', '王总', '领导')], []);
    const a = giftAdvice(s, 'p1', '婚礼', { tier: 'standard', city: '二线' });
    expect(a.mid).toBe(1000);
    expect(a.low).toBeLessThan(a.mid);
    expect(a.mid).toBeLessThan(a.high);
    expect(a.reasons.length).toBeGreaterThanOrEqual(2);
  });

  it('giftAdvice：还礼不低于对方历史给过的金额', () => {
    const s = stateWith([person('p1', '老张')], [
      event('e1', 'p1', 'gift_get', 2000, NOW, { dir: 'in', occasion: '婚礼' })
    ]);
    const same = giftAdvice(s, 'p1', '婚礼', { tier: 'simple', city: '三线' });
    expect(same.mid).toBeGreaterThanOrEqual(2000);
    expect(same.reasons.some((r) => r.includes('2,000'))).toBe(true);

    const back = giftAdvice(s, 'p1', '还礼', { tier: 'simple', city: '三线' });
    expect(back.mid).toBeGreaterThanOrEqual(2000);
  });

  it('giftAdvice：净欠 ≥ 300 时上浮 10%', () => {
    const s = stateWith([person('p1', '老张', '领导')], [
      event('e1', 'p1', 'gift_get', 600, NOW, { dir: 'in', occasion: '节日' })
    ]);
    const a = giftAdvice(s, 'p1', '婚礼', { tier: 'standard', city: '二线' });
    /* 上浮必须真正落到报价上：以前只改文案不改金额，
       文案写「上浮 10% 约 1,100」而返回的 mid 仍是 1,000。 */
    const base = giftAdvice({ ...s, events: [] } as never, 'p1', '婚礼', { tier: 'standard', city: '二线' });
    expect(a.mid).toBeGreaterThan(base.mid);
    expect(a.reasons.some((r) => r.includes('10%'))).toBe(true);
  });

  it('ledgerInsights：本月收支、平均与最花心思的场合', () => {
    const s = stateWith([person('p1', '张三')], [
      event('e1', 'p1', 'gift_give', 600, NOW, { dir: 'out', occasion: '生日' }),
      event('e2', 'p1', 'gift_give', 1000, NOW, { dir: 'out', occasion: '婚礼' }),
      event('e3', 'p1', 'gift_get', 500, NOW, { dir: 'in', occasion: '节日' })
    ]);
    const ins = ledgerInsights(s, NOW);
    expect(ins.monthGiven).toBe(1600);
    expect(ins.monthReceived).toBe(500);
    expect(ins.monthCount).toBe(3);
    expect(ins.avgGiven).toBe(800);
    expect(ins.maxGift).toBe(1000);
    expect(ins.topOccasion).toBe('婚礼');
    expect(ins.topOccasionAmount).toBe(1000);
  });

  it('settlePrefill：礼金结礼金、借款结借款，两者不混算', () => {
    /* 语义已修正：以前用总净额结清，会把「收礼 800 + 借款 5000」算成 5800。
       借款余额与礼金余额必须各自独立结算，否则还错钱会永久改写账本。 */
    const owe = stateWith([person('p1', '张三')], [event('e1', 'p1', 'gift_get', 800, NOW, { dir: 'in' })]);
    // 纯礼金：没有借款，借款结清应为空
    expect(settlePrefill(owe, 'p1', 'loan')).toBeNull();
    const gift = settlePrefill(owe, 'p1', 'gift');
    expect(gift).toMatchObject({ type: 'gift_give', occasion: '还礼', amount: 800, dir: 'out' });

    const due = stateWith([person('p1', '张三')], [event('e1', 'p1', 'gift_give', 1200, NOW, { dir: 'out' })]);
    expect(settlePrefill(due, 'p1', 'loan')).toBeNull();
    expect(settlePrefill(due, 'p1', 'gift')).toMatchObject({ type: 'gift_get', dir: 'in', amount: 1200 });

    const clear = stateWith([person('p1', '张三')], []);
    expect(settlePrefill(clear, 'p1', 'loan')).toBeNull();
    expect(settlePrefill(clear, 'nope', 'loan')).toBeNull();
  });

  it('settlePrefill：借款与礼金分开结算，不用总净额', () => {
    const mixed = stateWith(
      [person('p1', '张三')],
      [
        event('e1', 'p1', 'gift_get', 1000, NOW, { dir: 'in' }),
        event('e2', 'p1', 'money', 5000, NOW, { dir: 'in' })
      ]
    );
    // 借款 5000 + 礼金 1000：借款结清只还 5000，不能是 6000
    expect(settlePrefill(mixed, 'p1', 'loan')).toMatchObject({ type: 'money', amount: 5000, dir: 'out' });
    expect(settlePrefill(mixed, 'p1', 'gift')).toMatchObject({ type: 'gift_give', amount: 1000, dir: 'out' });
  });
});
