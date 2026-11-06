import { describe, expect, it } from 'vitest';
import {
  BASE_PACK,
  emptyKnowledgeBase,
  importKnowledge,
  localMarketRate,
  mergePacks,
  rulesFor,
  validatePack,
  validateRate
} from '../src/knowledge';

describe('内置礼俗包', () => {
  it('包含白事与探病的高危禁忌', () => {
    const s = emptyKnowledgeBase();
    const funeral = rulesFor(s, '白事');
    expect(funeral.some((r) => r.severity === 'high')).toBe(true);
    expect(funeral.map((r) => r.text).join()).toContain('红');
  });

  it('内置包不可被外部覆盖', () => {
    const r = importKnowledge({
      packs: [{ id: 'base', name: '假冒', priority: 999, rules: [{ id: 'x', occasions: [], text: '假的' }] }]
    });
    // 只有 base 一份，没有新增条目 → 视为空导入
    expect(r.ok).toBe(false);
  });

  it('给领导送现金的规则只对领导/客户生效', () => {
    const s = emptyKnowledgeBase();
    const withLeader = rulesFor(s, '婚礼', '领导').some((r) => r.id === 'leader-cash');
    const withFriend = rulesFor(s, '婚礼', '朋友').some((r) => r.id === 'leader-cash');
    expect(withLeader).toBe(true);
    expect(withFriend).toBe(false);
  });
});

describe('导入校验', () => {
  it('拒绝非对象', () => {
    expect(validatePack(null).ok).toBe(false);
    expect(validatePack([]).ok).toBe(false);
    expect(validatePack('x').ok).toBe(false);
  });

  it('拒绝缺 id / 缺 name / 缺 rules', () => {
    expect(validatePack({ name: 'a', rules: [] }).ok).toBe(false);
    expect(validatePack({ id: 'a', rules: [] }).ok).toBe(false);
    expect(validatePack({ id: 'a', name: 'b' }).ok).toBe(false);
  });

  it('拒绝规则缺 text 或 id', () => {
    expect(validatePack({ id: 'a', name: 'b', rules: [{ id: 'x' }] }).ok).toBe(false);
    expect(validatePack({ id: 'a', name: 'b', rules: [{ text: 'x' }] }).ok).toBe(false);
  });

  it('接受合法礼俗包并规范化 severity', () => {
    const r = validatePack({
      id: 'hz', name: '杭州', scope: '杭州', priority: 10,
      rules: [{ id: 'hz-1', occasions: ['婚礼'], severity: 'high', text: '杭州讲究双数' }]
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.pack.rules[0].severity).toBe('high');
    expect(r.pack.priority).toBe(10);
  });

  it('行情金额必须满足 0 ≤ low ≤ high', () => {
    expect(validateRate({ scope: '杭州', occasion: '婚礼', low: 800, high: 600 }).ok).toBe(false);
    expect(validateRate({ scope: '杭州', occasion: '婚礼', low: -1, high: 600 }).ok).toBe(false);
    expect(validateRate({ scope: '杭州', occasion: '婚礼', low: 600, high: 1200 }).ok).toBe(true);
  });
});

describe('合并与覆盖', () => {
  it('高优先级包覆盖同 id 规则', () => {
    const merged = mergePacks([
      BASE_PACK as never,
      {
        id: 'hz', name: '杭州', priority: 10,
        rules: [{ id: 'funeral-parity', occasions: ['白事'], severity: 'normal', text: '杭州白事帛金取 301 / 501 为主' }]
      }
    ]);
    const rule = merged.find((r) => r.id === 'funeral-parity');
    expect(rule?.text).toContain('杭州');
  });

  it('低优先级包不能覆盖高优先级', () => {
    const merged = mergePacks([
      { id: 'hi', name: 'hi', priority: 10, rules: [{ id: 'x', occasions: [], severity: 'normal', text: '高' }] },
      { id: 'lo', name: 'lo', priority: 1, rules: [{ id: 'x', occasions: [], severity: 'normal', text: '低' }] }
    ]);
    expect(merged.find((r) => r.id === 'x')?.text).toBe('高');
  });
});

describe('本地行情', () => {
  it('没有行情时返回 null，不拿全国标准冒充本地', () => {
    expect(localMarketRate(emptyKnowledgeBase(), '婚礼', '杭州')).toBeNull();
  });

  it('按地区匹配行情', () => {
    const kb = emptyKnowledgeBase();
    kb.rates = [
      { id: 'r1', scope: '杭州', occasion: '婚礼', low: 600, high: 1200 },
      { id: 'r2', scope: '成都', occasion: '婚礼', low: 400, high: 800 }
    ];
    expect(localMarketRate(kb, '婚礼', '杭州')?.low).toBe(600);
    expect(localMarketRate(kb, '婚礼', '成都')?.low).toBe(400);
  });

  it('同地区优先取身份匹配的行情', () => {
    const kb = emptyKnowledgeBase();
    kb.rates = [
      { id: 'r1', scope: '杭州', occasion: '婚礼', low: 600, high: 1200 },
      { id: 'r2', scope: '杭州', occasion: '婚礼', identity: '同事', low: 500, high: 800 }
    ];
    expect(localMarketRate(kb, '婚礼', '杭州', '同事')?.low).toBe(500);
  });

  it('场合不匹配时返回 null', () => {
    const kb = emptyKnowledgeBase();
    kb.rates = [{ id: 'r1', scope: '杭州', occasion: '婚礼', low: 600, high: 1200 }];
    expect(localMarketRate(kb, '白事', '杭州')).toBeNull();
  });
});

describe('完整导入', () => {
  it('同时导入礼俗包与行情', () => {
    const r = importKnowledge({
      packs: [{ id: 'hz', name: '杭州', scope: '杭州', priority: 5, rules: [{ id: 'hz1', occasions: ['婚礼'], text: '本地讲究' }] }],
      rates: [{ scope: '杭州', occasion: '婚礼', low: 600, high: 1200 }]
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.kb.packs.length).toBe(2);
    expect(r.kb.rates.length).toBe(1);
  });

  it('空文件被拒绝', () => {
    expect(importKnowledge({}).ok).toBe(false);
    expect(importKnowledge({ packs: [], rates: [] }).ok).toBe(false);
  });

  it('一条坏数据让整个导入失败，不做部分导入', () => {
    const r = importKnowledge({
      packs: [{ id: 'ok', name: 'ok', rules: [{ id: 'a', text: 'fine' }] }],
      rates: [{ scope: '杭州', occasion: '婚礼', low: 900, high: 100 }]
    });
    expect(r.ok).toBe(false);
  });
});
