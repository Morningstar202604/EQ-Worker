import { describe, expect, it } from 'vitest';
import { flowSvg } from '../src/flow';

describe('flowSvg', () => {
  it('distinguishes incoming and outgoing rows', () => {
    const svg = flowSvg([
      { label: '礼金', value: 500, dir: 'in' },
      { label: '宴请', value: 300, dir: 'out' },
    ]);

    expect(svg).toContain('收 500 元');
    expect(svg).toContain('支 300 元');
    expect(svg).toContain('净 200 元');
    expect((svg.match(/class="viz-flow-bar"/g) ?? [])).toHaveLength(2);
    expect(svg).toContain('fill="#5f8575"');
    expect(svg).toContain('fill="#c9a86a"');
  });

  it('drops zero-value rows and shows an empty state when all rows are zero', () => {
    expect(flowSvg([{ label: '零', value: 0, dir: 'in' }])).toContain('暂无收支数据');

    const svg = flowSvg([
      { label: '零', value: 0, dir: 'in' },
      { label: '有', value: 10, dir: 'in' },
    ]);
    expect((svg.match(/class="viz-flow-bar"/g) ?? [])).toHaveLength(1);
    expect(svg).toContain('有');
    expect(svg).not.toContain('零');
  });

  it('sorts bars from the largest value to the smallest', () => {
    const svg = flowSvg([
      { label: '小', value: 10, dir: 'out' },
      { label: '大', value: 900, dir: 'in' },
      { label: '中', value: 100, dir: 'in' },
    ]);
    const big = svg.indexOf('>大<');
    const middle = svg.indexOf('>中<');
    const small = svg.indexOf('>小<');

    expect(big).toBeGreaterThan(-1);
    expect(big).toBeLessThan(middle);
    expect(middle).toBeLessThan(small);
  });

  it('never emits NaN for negative or non-finite values', () => {
    const svg = flowSvg([
      { label: '负', value: -50, dir: 'out' },
      { label: '坏', value: Number.NaN, dir: 'in' },
      { label: '无穷', value: Number.POSITIVE_INFINITY, dir: 'in' },
    ]);

    expect(svg).not.toContain('NaN');
    expect(svg).not.toContain('Infinity');
  });

  it('escapes labels and stays deterministic', () => {
    const rows = [{ label: '<script>A&B</script>', value: 42, dir: 'in' as const }];

    expect(flowSvg(rows)).toBe(flowSvg(rows));
    const svg = flowSvg(rows);
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&lt;script&gt;A&amp;B&lt;/script&gt;');
  });
});
