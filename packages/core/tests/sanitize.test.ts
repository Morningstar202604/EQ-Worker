import { describe, expect, it } from 'vitest';
import { sanitizeImport } from '../src/sanitize';
import type { EventType } from '../src/types';

describe('sanitizeImport', () => {
  it('events 非数组时降级为空数组而不是崩溃', () => {
    const c = sanitizeImport({ persons: [{ name: 'A' }], events: 'not-an-array' });
    expect(Array.isArray(c.events)).toBe(true);
    expect(c.events).toHaveLength(0);
  });

  it('progress.best 非数字修正为 0，times 保留数字', () => {
    const c = sanitizeImport({ persons: [{ name: 'A' }], progress: { s1: { best: 'oops', times: 3 } } });
    expect(c.progress.s1.best).toBe(0);
    expect(Number.isFinite(c.progress.s1.best)).toBe(true);
    expect(c.progress.s1.times).toBe(3);
  });

  it('缺 weight 时按事件类型基准补齐，冲突强制为负', () => {
    const c = sanitizeImport({
      persons: [{ name: 'A' }],
      events: [
        { id: 'e1', personId: 'p', type: 'meal', time: 1 },
        { id: 'e2', personId: 'p', type: 'conflict', time: 1 },
        { id: 'e3', personId: 'p', type: 'conflict', time: 1, weight: 7 }
      ]
    });
    expect(c.events[0].weight).toBe(7);
    expect(c.events[1].weight).toBe(-10);
    expect(c.events[2].weight).toBe(-7);
  });

  it('旧数据缺 dir 时按类型推断，金额为 0 统一 none', () => {
    const c = sanitizeImport({
      persons: [{ name: 'A' }],
      events: [
        { id: 'e1', personId: 'p', type: 'gift_get', time: 1, amount: 500 },
        { id: 'e2', personId: 'p', type: 'gift_give', time: 1, amount: 500 },
        { id: 'e3', personId: 'p', type: 'money', time: 1, amount: 200 },
        { id: 'e4', personId: 'p', type: 'gift_get', time: 1, amount: 0 }
      ]
    });
    expect(c.events.map((e) => e.dir)).toEqual(['in', 'out', 'in', 'none']);
  });

  it('姓名超长截断到 60，标签截断到 20 字最多 10 个', () => {
    const c = sanitizeImport({
      persons: [{ name: '名'.repeat(80), tags: Array.from({ length: 12 }, () => '标'.repeat(30)) }]
    });
    expect(c.persons[0].name).toHaveLength(60);
    expect(c.persons[0].tags).toHaveLength(10);
    expect(c.persons[0].tags[0]).toHaveLength(20);
  });

  it('过滤无效人脉与脏事件并记录 warn', () => {
    const c = sanitizeImport({
      persons: [{ name: '有效' }, { name: '  ' }, null, { id: 'x' }],
      events: [
        { id: 'e1', personId: 'x', type: 'meal', time: 1, weight: 7 },
        { personId: 'x', time: 1 },
        { personId: 'x', type: 'meal', time: 0 }
      ]
    });
    expect(c.persons).toHaveLength(1);
    expect(c.events).toHaveLength(1);
    expect(c.warn).toContain('人脉 3 条');
    expect(c.warn).toContain('往来 2 条');
  });

  it('settings 非法值回落默认，AI 默认关闭', () => {
    const c = sanitizeImport({ settings: { giftTier: 'huge', cityTier: '八线' } });
    expect(c.settings.giftTier).toBe('standard');
    expect(c.settings.cityTier).toBe('二线');
    expect(c.settings.ai).toEqual({ enabled: false, providerId: '', model: '', baseUrl: '', temperature: 0.7 });
  });

  it('schema 版本不同会标记 schemaMismatch', () => {
    expect(sanitizeImport({ schema: 4 }).schemaMismatch).toBe(true);
    expect(sanitizeImport({ schema: 5 }).schemaMismatch).toBe(false);
  });

  it('事件类型保留为类型字符串，未知类型按 other 计算权重', () => {
    const c = sanitizeImport({ persons: [{ name: 'A' }], events: [{ personId: 'p', type: 'weird', time: 1 }] });
    expect(c.events[0].type).toBe('weird' as EventType);
    expect(c.events[0].weight).toBe(2);
  });
});
