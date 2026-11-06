import { describe, expect, it } from 'vitest';
import { CONDOLENCE_AMOUNTS, GIFT_BASE, OCCASIONS, SCENARIOS } from '../src/constants';
import { SCRIPT_SCENES } from '../src/scripts';
import { etiquetteTips } from '../src/etiquette';
import { giftAdvice, niceAmount } from '../src/ledger';
import { checkGiftTaboo, giftAvoidTips } from '../src/ledger';
import { createEmptyState } from '../src/sanitize';
import type { AppState, CityTier, GiftTier, Person, PersonalEvent } from '../src/types';

const NOW = new Date(2026, 9, 31, 12, 0, 0).getTime();
const DAY = 86400000;

function person(id: string, identity: string, extra: Partial<Person> = {}): Person {
  return {
    id, name: 'P' + id, identity, tags: [], birthday: '', anniversary: '',
    likes: '', taboos: '', note: '', adjust: 0, createdAt: NOW, ...extra
  };
}

function event(id: string, personId: string, extra: Partial<PersonalEvent> = {}): PersonalEvent {
  return {
    id, personId, type: 'gift_get', title: '礼', time: NOW - 10 * DAY,
    weight: 1, note: '', amount: 0, dir: 'in', occasion: '婚礼', ...extra
  };
}

function state(persons: Person[], events: PersonalEvent[] = []): AppState {
  const s = createEmptyState();
  s.persons = persons;
  s.events = events;
  s.settings = { giftTier: 'standard', cityTier: '二线', ai: { enabled: false, providerId: '', model: '', baseUrl: '', temperature: 0.7 } };
  return s;
}

describe('白事（帛金）', () => {
  it('白事是独立场合，不再静默回落到「其他」', () => {
    const s = state([person('a', '同事')]);
    const advice = giftAdvice(s, 'a', '白事');
    expect(advice.occasion).toBe('白事');
    expect(advice.reasons[0]).toContain('白事');
  });

  it('白事三档都是单数', () => {
    for (const identity of ['同事', '朋友', '长辈', '家人', '领导']) {
      const s = state([person('a', identity)]);
      const a = giftAdvice(s, 'a', '白事');
      for (const v of [a.low, a.mid, a.high]) {
        expect(v % 2, `${identity} 的帛金 ${v} 应为单数`).toBe(1);
      }
    }
  });

  it('白事不会给出喜事吉数（600/800/1000）', () => {
    const forbidden = new Set([600, 800, 1000, 1200, 1600, 2000]);
    for (const identity of Object.keys(GIFT_BASE)) {
      const s = state([person('a', identity)]);
      const a = giftAdvice(s, 'a', '白事');
      for (const v of [a.low, a.mid, a.high]) {
        expect(forbidden.has(v), `${identity} 的帛金 ${v} 不应是喜事吉数`).toBe(false);
      }
    }
  });

  it('白事候选金额全部是单数', () => {
    for (const v of CONDOLENCE_AMOUNTS) expect(v % 2).toBe(1);
  });

  it('白事给出「按当地风俗」的免责说明', () => {
    const s = state([person('a', '朋友')]);
    expect(giftAdvice(s, 'a', '白事').reasons.join()).toContain('当地习惯');
  });
});

describe('新增场合', () => {
  it('升学/寿宴/开业都是独立场合', () => {
    const s = state([person('a', '同事')]);
    for (const occ of ['升学', '寿宴', '开业']) {
      expect(giftAdvice(s, 'a', occ).occasion).toBe(occ);
    }
  });

  it('OCCASIONS 覆盖红白事主谱', () => {
    for (const occ of ['婚礼', '满月', '乔迁', '探病', '白事', '寿宴', '升学', '开业']) {
      expect(OCCASIONS).toContain(occ);
    }
  });
});

describe('还礼金额规则', () => {
  it('历史来礼 1050 时，建议档与重视档不低于 1050', () => {
    /* 语义约定：mid/high 必须守住「还礼不低于对方给过的数」；
       low 是「从简」档，允许低于锚点（量力而行、以到场补上），
       否则三档会被锚点挤成同一个数，档位切换失效。 */
    const s = state([person('a', '朋友')], [event('e1', 'a', { amount: 1050, occasion: '婚礼' })]);
    const a = giftAdvice(s, 'a', '婚礼', { tier: 'simple', city: '三线' });
    expect(a.mid).toBeGreaterThanOrEqual(1050);
    expect(a.high).toBeGreaterThanOrEqual(1050);
    expect(a.low).toBeLessThan(a.mid);
  });

  it('三档严格递增，遍历全部身份×场合×档位×城市', () => {
    const identities = Object.keys(GIFT_BASE);
    const tiers: GiftTier[] = ['simple', 'standard', 'generous'];
    const cities: CityTier[] = ['三线', '二线', '一线'];
    const failures: string[] = [];
    for (const identity of identities) {
      for (const occ of OCCASIONS) {
        for (const tier of tiers) {
          for (const city of cities) {
            const a = giftAdvice(state([person('x', identity)]), 'x', occ, { tier, city });
            if (!(a.low < a.mid && a.mid < a.high)) {
              failures.push(`${identity}/${occ}/${tier}/${city}=${a.low}/${a.mid}/${a.high}`);
            }
          }
        }
      }
    }
    expect(failures).toEqual([]);
  });

  it('红白事不可对冲：收过帛金后办喜事要单独按喜事行情随', () => {
    const s = state([person('a', '邻居')], [event('e1', 'a', { amount: 501, occasion: '白事' })]);
    const advice = giftAdvice(s, 'a', '婚礼');
    expect(advice.reasons.join()).toContain('白事与喜事不能等额对冲');
  });
});

describe('送礼忌讳', () => {
  it('识别钟/伞/梨等通行忌讳', () => {
    expect(checkGiftTaboo('送一座挂钟', '生日').length).toBeGreaterThan(0);
    expect(checkGiftTaboo('一把雨伞', '婚礼').length).toBeGreaterThan(0);
    expect(checkGiftTaboo('一箱雪梨', '探病').length).toBeGreaterThan(0);
  });

  it('不把「凤梨酥」「菊花茶」「钟爱一生」误判为忌讳', () => {
    expect(checkGiftTaboo('凤梨酥', '探病')).toEqual([]);
    expect(checkGiftTaboo('菊花茶', '节日')).toEqual([]);
    expect(checkGiftTaboo('钟爱一生巧克力', '婚礼')).toEqual([]);
    expect(checkGiftTaboo('鞋柜', '乔迁')).toEqual([]);
  });

  it('白事不套用送礼忌讳（帛金本身就合规）', () => {
    expect(checkGiftTaboo('钟', '白事')).toEqual([]);
  });

  it('每个场合都能给出可执行的避雷提示', () => {
    for (const occ of OCCASIONS) {
      expect(giftAvoidTips(occ).length).toBeGreaterThan(0);
    }
  });
});

describe('礼俗提示', () => {
  it('白事有高危禁忌（穿红/道喜）', () => {
    const tips = etiquetteTips('白事');
    expect(tips.some((t) => t.severity === 'high')).toBe(true);
    expect(tips.map((t) => t.text).join()).toContain('红');
  });

  it('探病有梨与白菊禁忌', () => {
    expect(etiquetteTips('探病').map((t) => t.text).join()).toContain('梨');
  });

  it('给领导送现金的风险提示只在领导/客户时出现', () => {
    const withLeader = etiquetteTips('婚礼', '领导').some((t) => t.text.includes('购物卡'));
    const withFriend = etiquetteTips('婚礼', '朋友').some((t) => t.text.includes('购物卡'));
    expect(withLeader).toBe(true);
    expect(withFriend).toBe(false);
  });

  it('红白不可对冲的提示由 giftAdvice 统一给出（不再有重复实现）', () => {
    const s = state([person('a', '邻居')], [event('e1', 'a', { amount: 501, occasion: '白事' })]);
    expect(giftAdvice(s, 'a', '婚礼').reasons.join()).toContain('不能等额对冲');
    expect(giftAdvice(s, 'a', '探病').reasons.join()).not.toContain('不能等额对冲');
  });
});

describe('话术与题库覆盖红白事', () => {
  it('有话术场景覆盖白事慰问', () => {
    expect(SCRIPT_SCENES.some((s) => s.id === 'condolence')).toBe(true);
  });

  it('白事话术不提「恭喜/红包」', () => {
    const scene = SCRIPT_SCENES.find((s) => s.id === 'condolence');
    expect(scene).toBeTruthy();
    if (!scene) return;
    const built = scene.build({
      name: '张三', identity: '同事', eventType: '', eventTitle: '', context: '', likes: '', taboos: ''
    });
    for (const text of [built.stable, built.close, built.brief]) {
      expect(text).not.toContain('恭喜');
      expect(text).not.toContain('红包');
    }
  });

  it('题库覆盖白事、吊唁话术、升学宴、红白不可对冲', () => {
    const ids = SCENARIOS.map((s) => s.id);
    for (const id of ['funeral', 'condolence_words', 'school_banquet', 'funeral_money_return']) {
      expect(ids).toContain(id);
    }
  });

  it('白事题目的高分选项强调到场与单数', () => {
    const scene = SCENARIOS.find((s) => s.id === 'funeral');
    expect(scene).toBeTruthy();
    if (!scene) return;
    const best = [...scene.choices].sort((a, b) => b.s - a.s)[0];
    expect(best.r).toContain('单数');
  });
});

describe('niceAmount 基础契约不受影响', () => {
  it('喜事仍返回常规吉数', () => {
    expect(niceAmount(1050)).toBe(1000);
    expect(niceAmount(0)).toBe(0);
    expect(niceAmount(Number.NaN)).toBe(0);
  });
});
