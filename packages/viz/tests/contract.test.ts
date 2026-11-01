import { describe, expect, it } from 'vitest';
import { escapeXml } from '../src/escape';
import { radarSvg } from '../src/radar';
import { networkSvg } from '../src/network';
import { trendSvg } from '../src/trend';
import { flowSvg } from '../src/flow';
import { gaugeSvg } from '../src/gauge';
import { palette } from '../src/palette';

const samples: [string, () => string][] = [
  [
    'radar',
    () =>
      radarSvg([
        { label: '亲密度', value: 80 },
        { label: '互惠度', value: 65 },
        { label: '及时性', value: 45 },
        { label: '稳定性', value: 90 },
        { label: '成长性', value: 30 },
      ]),
  ],
  [
    'network',
    () =>
      networkSvg(
        [
          { id: 'p1', label: '张三', weight: 12 },
          { id: 'p2', label: '李四', weight: 8 },
          { id: 'p3', label: '王五', weight: 5 },
        ],
        [
          { source: 'p1', target: 'p2', weight: 6 },
          { source: 'p2', target: 'p3', weight: 2 },
        ],
      ),
  ],
  [
    'trend',
    () =>
      trendSvg([
        { label: '一月', given: 200, received: 120 },
        { label: '二月', given: 80, received: 300 },
      ]),
  ],
  [
    'flow',
    () =>
      flowSvg([
        { label: '礼金', value: 500, dir: 'in' },
        { label: '宴请', value: 300, dir: 'out' },
      ]),
  ],
  ['gauge', () => gaugeSvg(72)],
];

describe('SVG contract', () => {
  it.each(samples)('%s is deterministic across 20 runs', (_, render) => {
    const first = render();
    for (let run = 0; run < 20; run += 1) {
      expect(render()).toBe(first);
    }
  });

  it.each(samples)('%s is well-formed XML', (_, render) => {
    const document = new DOMParser().parseFromString(render(), 'image/svg+xml');

    expect(document.querySelector('parsererror')).toBeNull();
    expect(document.documentElement.tagName.toLowerCase()).toBe('svg');
  });

  it.each(samples)('%s exposes accessible structure', (_, render) => {
    const document = new DOMParser().parseFromString(render(), 'image/svg+xml');
    const svg = document.documentElement;

    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('width')).toBe('100%');
    expect(svg.getAttribute('viewBox')).toMatch(/^0 0 \d+ \d+$/);
    expect(svg.getAttribute('aria-label')?.length ?? 0).toBeGreaterThan(0);
    expect(svg.querySelector('title')?.textContent?.trim().length ?? 0).toBeGreaterThan(0);
    expect(svg.querySelector('desc')?.textContent?.trim().length ?? 0).toBeGreaterThan(0);
    expect(svg.getAttribute('width')).not.toMatch(/\d+px/);
  });

  it.each(samples)('%s only uses palette colors', (_, render) => {
    const allowed = new Set<string>(Object.values(palette));
    const colors = [...render().matchAll(/(?:fill|stroke)="(#[0-9a-fA-F]{6})"/g)].map((match) => match[1]);
    const foreign = colors.filter((color) => !allowed.has(color.toLowerCase()) && !allowed.has(color));

    expect(colors.length).toBeGreaterThan(0);
    expect(foreign).toEqual([]);
  });

  it('escapeXml covers all five dangerous characters used by every renderer', () => {
    const hostile = `<script>alert("x" & 'y')</script>`;
    const escaped = escapeXml(hostile);
    const renders = [
      radarSvg([{ label: hostile, value: 10 }, { label: 'b', value: 20 }, { label: 'c', value: 30 }]),
      networkSvg([{ id: hostile, label: hostile, weight: 1 }], []),
      trendSvg([{ label: hostile, given: 1, received: 2 }]),
      flowSvg([{ label: hostile, value: 1, dir: 'in' }]),
      gaugeSvg(50, { label: hostile }),
    ];

    expect(escaped).not.toContain('<');
    for (const svg of renders) {
      expect(svg).not.toContain('<script>');
      expect(svg).toContain('&lt;script&gt;');
    }
  });
});
