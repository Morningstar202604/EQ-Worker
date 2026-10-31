import { describe, expect, it } from 'vitest';
import { gaugeSvg } from '../src/gauge';

function scoreText(svg: string): string | null {
  return /class="viz-gauge-score"[^>]*>([^<]*)</.exec(svg)?.[1] ?? null;
}

describe('gaugeSvg', () => {
  it.each([0, 50, 100])('renders the exact score text for %i', (score) => {
    const svg = gaugeSvg(score);

    expect(scoreText(svg)).toBe(String(score));
    expect(svg).toContain('role="img"');
    expect(svg).toContain('aria-label=');
    expect(svg).toContain('class="viz-gauge-value"');
    expect(svg).not.toContain('NaN');
  });

  it('clamps out-of-range scores to 0-100', () => {
    expect(scoreText(gaugeSvg(-30))).toBe('0');
    expect(scoreText(gaugeSvg(180))).toBe('100');
  });

  it('shows the empty gauge track at 0 without a negative arc', () => {
    const svg = gaugeSvg(0);

    expect(svg).toContain('class="viz-gauge-track"');
    expect(svg).not.toContain('NaN');
  });

  it('falls back to 0 for non-finite input', () => {
    expect(scoreText(gaugeSvg(Number.NaN))).toBe('0');
    expect(scoreText(gaugeSvg(Number.POSITIVE_INFINITY))).toBe('0');
  });

  it('escapes custom label text', () => {
    const svg = gaugeSvg(72, { label: '<script>&"' });

    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&lt;script&gt;&amp;&quot;');
  });

  it('is deterministic', () => {
    expect(gaugeSvg(72)).toBe(gaugeSvg(72));
  });
});
