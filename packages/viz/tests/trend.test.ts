import { describe, expect, it } from 'vitest';
import { trendSvg } from '../src/trend';

const series = [
  { label: '一月', given: 200, received: 120 },
  { label: '二月', given: 80, received: 300 },
  { label: '三月', given: 160, received: 90 },
];

describe('trendSvg', () => {
  it('renders an empty state with a readable message', () => {
    const svg = trendSvg([]);

    expect(svg).toContain('暂无趋势数据');
    expect(svg).toContain('role="img"');
    expect(svg).toContain('aria-label=');
    expect(svg).not.toContain('NaN');
  });

  it('renders a single point without NaN or Infinity', () => {
    const svg = trendSvg([{ label: '本月', given: 100, received: 60 }]);

    expect(svg).toContain('class="viz-trend-bar"');
    expect(svg).toContain('class="viz-trend-dot"');
    expect(svg).toContain('本月');
    expect(svg).not.toContain('NaN');
    expect(svg).not.toContain('Infinity');
  });

  it('renders both series, the polyline and a legend', () => {
    const svg = trendSvg(series);

    expect((svg.match(/class="viz-trend-bar"/g) ?? [])).toHaveLength(3);
    expect(svg).toContain('<polyline class="viz-trend-line"');
    expect((svg.match(/class="viz-trend-dot"/g) ?? [])).toHaveLength(3);
    expect(svg).toContain('给出');
    expect(svg).toContain('收到');
    expect(svg).toContain('一月');
    expect(svg).toContain('三月');
  });

  it('keeps negative values renderable below the zero baseline', () => {
    const svg = trendSvg([
      { label: '亏', given: -120, received: 30 },
      { label: '平', given: 0, received: 0 },
      { label: '盈', given: 90, received: 200 },
    ]);

    expect(svg).toContain('class="viz-trend-bar"');
    expect(svg).toContain('class="viz-trend-baseline"');
    expect(svg).not.toContain('NaN');
    expect(svg).not.toContain('Infinity');
    expect(svg).not.toContain('-0,');
  });

  it('escapes labels and stays deterministic', () => {
    const data = [{ label: '<script>&"', given: 10, received: 20 }];

    expect(trendSvg(data)).toBe(trendSvg(data));
    const svg = trendSvg(data);
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&lt;script&gt;&amp;&quot;');
  });
});
