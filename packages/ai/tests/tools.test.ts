import { describe, expect, it } from 'vitest';
import {
  MAX_TOOL_CALLS,
  TOOL_DEFINITIONS,
  runTool,
  toolCatalog
} from '../src/tools';
import { createEmptyState } from '../../core/src/sanitize';
import { SCRIPT_SCENES } from '../../core/src/scripts';
import type { AppState, PersonalEvent, Person } from '../../core/src/types';

const NOW = new Date(2026, 10, 7, 12, 0, 0).getTime();
const DAY = 86400000;

function person(id: string, name: string, identity: string, extra: Partial<Person> = {}): Person {
  return {
    id, name, identity, tags: [], birthday: '', anniversary: '',
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
  return s;
}

describe('工具白名单', () => {
  it('只暴露只读查询工具，没有任何写操作', () => {
    const names = TOOL_DEFINITIONS.map((t) => t.name);
    for (const forbidden of ['add_person', 'delete', 'record_event', 'import', 'reset', 'update']) {
      expect(names).not.toContain(forbidden);
    }
  });

  it('每个工具都有描述与 JSON Schema', () => {
    for (const t of TOOL_DEFINITIONS) {
      expect(t.description.length).toBeGreaterThan(10);
      expect(t.parameters).toHaveProperty('type', 'object');
    }
  });

  it('拒绝未知工具而不是静默放过', () => {
    const r = runTool('rm_rf', {}, { state: state([]), now: NOW });
    expect(r.ok).toBe(false);
    expect(r.content).toContain('未知工具');
  });

  it('工具清单可展示给用户', () => {
    const cat = toolCatalog();
    expect(cat.length).toBe(TOOL_DEFINITIONS.length);
    expect(cat[0]).toHaveProperty('name');
    expect(cat[0]).toHaveProperty('description');
  });
});

describe('姓名脱敏', () => {
  it('默认不把真实姓名返回给模型', () => {
    const s = state([person('p1', '张建国', '长辈')]);
    const r = runTool('find_person', { query: '张建国' }, { state: s, now: NOW });
    expect(r.ok).toBe(true);
    expect(r.content).not.toContain('张建国');
    expect(r.content).toContain('这位朋友');
  });

  it('用户显式允许时才返回姓名', () => {
    const s = state([person('p1', '张建国', '长辈')]);
    const r = runTool('find_person', { query: '张建国' }, { state: s, now: NOW, allowNames: true });
    expect(r.content).toContain('张建国');
  });

  it('健康排行同样脱敏', () => {
    const s = state([person('p1', '李四', '朋友')]);
    const r = runTool('health_ranking', {}, { state: s, now: NOW });
    expect(r.content).not.toContain('李四');
  });
});

describe('工具正确性', () => {
  it('find_person 支持精确与模糊匹配', () => {
    const s = state([person('p1', '张建国', '长辈'), person('p2', '张伟', '同事')]);
    expect(runTool('find_person', { query: '张建国' }, { state: s, now: NOW }).content).toContain('p1');
    expect(runTool('find_person', { query: '张' }, { state: s, now: NOW }).content).toContain('p1');
  });

  it('find_person 查不到时明确说明，不编造', () => {
    const r = runTool('find_person', { query: '不存在' }, { state: state([]), now: NOW });
    expect(r.content).toContain('没有找到');
  });

  it('gift_advice 返回三档且白事为单数', () => {
    const s = state([person('p1', '甲', '同事')]);
    const r = runTool('gift_advice', { personId: 'p1', occasion: '白事' }, { state: s, now: NOW });
    expect(r.ok).toBe(true);
    const nums = [...r.content.matchAll(/¥([\d,]+)/g)].map((m) => Number(m[1].replace(/,/g, '')));
    expect(nums.length).toBeGreaterThanOrEqual(3);
    expect(nums.slice(0, 3).every((n) => n % 2 === 1)).toBe(true);
  });

  it('gift_advice 对不存在的 personId 报错而不是瞎算', () => {
    const r = runTool('gift_advice', { personId: 'ghost', occasion: '婚礼' }, { state: state([]), now: NOW });
    expect(r.ok).toBe(false);
    expect(r.content).toContain('find_person');
  });

  it('person_ledger 借款与礼金分开报，不混算', () => {
    const s = state([person('p1', '甲', '朋友')], [
      event('e1', 'p1', { type: 'gift_get', amount: 1000, dir: 'in' }),
      event('e2', 'p1', { type: 'money', amount: 5000, dir: 'out' })
    ]);
    const r = runTool('person_ledger', { personId: 'p1' }, { state: s, now: NOW });
    expect(r.content).toContain('借款');
    expect(r.content).toContain('礼金');
    expect(r.content).toContain('5,000');
    expect(r.content).toContain('1,000');
  });

  it('etiquette_rules 对白事给出高危禁忌', () => {
    const r = runTool('etiquette_rules', { occasion: '白事' }, { state: state([]), now: NOW });
    expect(r.content).toContain('务必避');
  });

  it('script_scene 生成三种语气', () => {
    const s = state([person('p1', '甲', '同事')]);
    const r = runTool('script_scene', { sceneId: 'thanks', personId: 'p1' }, { state: s, now: NOW });
    expect(r.ok).toBe(true);
    expect(r.content).toContain('稳妥');
    expect(r.content).toContain('亲近');
    expect(r.content).toContain('简短');
  });

  it('list_scenes 覆盖全部场景', () => {
    const r = runTool('list_scenes', {}, { state: state([]), now: NOW });
    for (const sc of SCRIPT_SCENES) {
      expect(r.content).toContain(sc.id);
    }
  });

  it('today_actions 尊重条数上限', () => {
    const s = state([person('p1', '甲', '朋友')], [event('e', 'p1', { type: 'help_them', title: '帮忙', time: NOW - DAY })]);
    const r = runTool('today_actions', { limit: 1 }, { state: s, now: NOW });
    const lines = r.content.split('\n').filter(Boolean);
    expect(lines.length).toBeLessThanOrEqual(1);
  });

  it('today_actions 的 limit 被夹在 1–20，防止模型传奇怪值', () => {
    const s = state([person('p1', '甲', '朋友')]);
    expect(runTool('today_actions', { limit: 999 }, { state: s, now: NOW }).ok).toBe(true);
    expect(runTool('today_actions', { limit: -5 }, { state: s, now: NOW }).ok).toBe(true);
  });

  it('坏参数不会抛异常，而是返回 ok:false', () => {
    const r = runTool('gift_advice', { personId: null, occasion: null } as never, { state: state([]), now: NOW });
    expect(r.ok).toBe(false);
  });
});

describe('调用上限', () => {
  it('MAX_TOOL_CALLS 是有限正整数，用于防止死循环', () => {
    expect(Number.isInteger(MAX_TOOL_CALLS)).toBe(true);
    expect(MAX_TOOL_CALLS).toBeGreaterThan(0);
    expect(MAX_TOOL_CALLS).toBeLessThanOrEqual(10);
  });
});
