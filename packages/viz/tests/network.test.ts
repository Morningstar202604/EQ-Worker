import { describe, expect, it } from 'vitest';
import { networkSvg } from '../src/network';

const nodes = [
  { id: 'p1', label: '张三', weight: 12 },
  { id: 'p2', label: '李四', weight: 8 },
  { id: 'p3', label: '王五', weight: 5 },
];

const links = [
  { source: 'p1', target: 'p2', weight: 6 },
  { source: 'p2', target: 'p3', weight: 2 },
];

describe('networkSvg', () => {
  it('is byte-identical across repeated calls', () => {
    expect(networkSvg(nodes, links)).toBe(networkSvg(nodes, links));
  });

  it('renders nodes, edges and clickable person anchors', () => {
    const svg = networkSvg(nodes, links);

    expect(svg).toContain('role="img"');
    expect(svg).toContain('aria-label=');
    expect((svg.match(/class="viz-network-node"/g) ?? [])).toHaveLength(3);
    expect((svg.match(/class="viz-network-edge"/g) ?? [])).toHaveLength(2);
    expect((svg.match(/data-person-id=/g) ?? [])).toHaveLength(3);
    expect(svg).toContain('data-person-id="p1"');
    expect(svg).toContain('href="#person-p1"');
  });

  it('renders an empty state for an empty graph', () => {
    const svg = networkSvg([], []);

    expect(svg).toContain('暂无关系数据');
    expect(svg).not.toContain('class="viz-network-node"');
    expect(svg).not.toContain('NaN');
  });

  it('renders a single node without links', () => {
    const svg = networkSvg([{ id: 'solo', label: '独行', weight: 3 }], []);

    expect((svg.match(/class="viz-network-node"/g) ?? [])).toHaveLength(1);
    expect(svg).toContain('data-person-id="solo"');
    expect(svg).not.toContain('class="viz-network-edge"');
    expect(svg).not.toContain('NaN');
  });

  it('caps visible labels when there are more than 30 nodes', () => {
    const many = Array.from({ length: 36 }, (_, index) => ({
      id: `p${index + 1}`,
      label: `联系人${index + 1}`,
      weight: index + 1,
    }));
    const svg = networkSvg(many, [{ source: 'p36', target: 'p1', weight: 9 }]);

    expect((svg.match(/data-person-id=/g) ?? [])).toHaveLength(36);
    expect((svg.match(/class="viz-network-label"/g) ?? []).length).toBeLessThanOrEqual(12);
    expect(svg).toContain('仅标注前 12 位');
    expect(svg).not.toContain('NaN');
  });

  it('escapes injected labels and ids', () => {
    const svg = networkSvg(
      [
        { id: '<script>alert(1)</script>', label: '"><img src=x onerror=alert(1)>', weight: 4 },
        { id: 'safe', label: 'A&B', weight: 1 },
      ],
      [{ source: 'safe', target: '<script>alert(1)</script>', weight: 1 }],
    );

    expect(svg).not.toContain('<script>');
    expect(svg).not.toContain('<img');
    expect(svg).toContain('&lt;script&gt;');
    expect(svg).toContain('&quot;&gt;&lt;img');
    expect(svg).toContain('A&amp;B');
  });
});
