import { describe, expect, it } from 'vitest';
import { radarSvg } from '../src/radar';

const fiveDims = [
  { label: '亲密度', value: 80 },
  { label: '互惠度', value: 65 },
  { label: '及时性', value: 45 },
  { label: '稳定性', value: 90 },
  { label: '成长性', value: 30 },
];

describe('radarSvg', () => {
  it('renders a five-dimension radar with grid, polygon, dots and labels', () => {
    const svg = radarSvg(fiveDims);

    expect(svg).toContain('role="img"');
    expect(svg).toContain('<title>');
    expect(svg).toContain('<desc>');
    expect(svg).toContain('aria-label=');
    expect(svg).toContain('<polygon class="viz-radar-grid"');
    expect(svg).toContain('<polygon class="viz-radar-area"');
    expect((svg.match(/class="viz-radar-dot"/g) ?? [])).toHaveLength(5);
    expect(svg).toContain('亲密度');
    expect(svg).toContain('80');
    expect(svg).toContain('viewBox="0 0 360 360"');
    expect(svg).toContain('width="100%"');
  });

  it('supports six dimensions with one dot per axis', () => {
    const svg = radarSvg([
      { label: '亲密度', value: 80 },
      { label: '互惠度', value: 65 },
      { label: '及时性', value: 45 },
      { label: '稳定性', value: 90 },
      { label: '成长性', value: 30 },
      { label: '边界感', value: 55 },
    ]);

    expect((svg.match(/class="viz-radar-dot"/g) ?? [])).toHaveLength(6);
    expect(svg).toContain('<polygon class="viz-radar-area"');
    expect(svg).toContain('边界感');
  });

  it('renders an all-zero dataset without NaN and shows an empty rating note', () => {
    const svg = radarSvg(fiveDims.map((dim) => ({ ...dim, value: 0 })));

    expect(svg).toContain('暂无评分');
    expect(svg).toContain('<polygon class="viz-radar-area"');
    expect(svg).not.toContain('NaN');
    expect(svg).not.toContain('Infinity');
  });

  it('renders a single dimension at 100 as a dot and label without a polygon area', () => {
    const svg = radarSvg([{ label: '亲密度', value: 100 }]);

    expect(svg).toContain('<circle class="viz-radar-dot"');
    expect(svg).not.toContain('class="viz-radar-area"');
    expect(svg).not.toContain('NaN');
    expect(svg).toContain('亲密度');
    expect(svg).toContain('100');
  });

  it('clamps values above 100 and below 0', () => {
    const svg = radarSvg([
      { label: '超上限', value: 150 },
      { label: '负值', value: -20 },
      { label: '正常', value: 60 },
    ]);

    expect(svg).not.toContain('150');
    expect(svg).not.toContain('-20');
    expect(svg).toContain('超上限 100');
    expect(svg).toContain('负值 0');
    expect(svg).not.toContain('NaN');
  });

  it('shows an empty state for no dimensions', () => {
    const svg = radarSvg([]);

    expect(svg).toContain('暂无雷达数据');
    expect(svg).toContain('role="img"');
    expect(svg).not.toContain('NaN');
  });

  it('is deterministic and escapes injected labels', () => {
    const data = [
      { label: '<script>alert(1)</script>', value: 70 },
      { label: 'A&B', value: 40 },
      { label: '正常', value: 20 },
    ];

    expect(radarSvg(data)).toBe(radarSvg(data));
    const svg = radarSvg(data);
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&lt;script&gt;');
    expect(svg).toContain('A&amp;B');
  });
});
