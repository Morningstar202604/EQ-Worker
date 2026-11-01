import { escapeXml } from './escape';
import { palette } from './palette';
import { clampNumber, finiteNumber, num, svgFrame } from './svg';

export interface GaugeOptions {
  width?: number;
  height?: number;
  title?: string;
  desc?: string;
  label?: string;
  size?: number;
}

const DEFAULT_WIDTH = 240;
const DEFAULT_HEIGHT = 180;

function polar(cx: number, cy: number, radius: number, angleDegrees: number): [number, number] {
  const angle = (angleDegrees * Math.PI) / 180;
  return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
}

function arcPath(cx: number, cy: number, radius: number, startAngle: number, endAngle: number): string {
  const [startX, startY] = polar(cx, cy, radius, startAngle);
  const [endX, endY] = polar(cx, cy, radius, endAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${num(startX)} ${num(startY)} A ${num(radius)} ${num(radius)} 0 ${largeArc} 1 ${num(endX)} ${num(endY)}`;
}

export function gaugeSvg(score: number, opts: GaugeOptions = {}): string {
  const width = Math.max(120, finiteNumber(opts.width, DEFAULT_WIDTH));
  const height = Math.max(100, finiteNumber(opts.height, DEFAULT_HEIGHT));
  const title = opts.title ?? '关系健康度';
  const label = opts.label ?? '健康度';
  const safeScore = clampNumber(finiteNumber(score, 0), 0, 100);

  const size = Math.max(60, Math.min(finiteNumber(opts.size, Math.min(width * 0.62, height * 0.86)), Math.min(width, height)));
  const cx = width / 2;
  const cy = height / 2 + size * 0.14;
  const radius = size / 2;
  const startAngle = 150;
  const sweep = 240;
  const endAngle = startAngle + sweep;
  const valueAngle = startAngle + (safeScore / 100) * sweep;
  const [needleX, needleY] = polar(cx, cy, radius - 8, valueAngle);
  const color = safeScore >= 70 ? palette.teal : safeScore >= 40 ? palette.gold : palette.red;

  const [startX, startY] = polar(cx, cy, radius, startAngle);
  const [endX, endY] = polar(cx, cy, radius, endAngle);

  const body = [
    '<g class="viz-gauge">',
    `<path class="viz-gauge-track" d="${arcPath(cx, cy, radius, startAngle, endAngle)}" fill="none" stroke="${palette.line}" stroke-opacity="0.28" stroke-width="12" stroke-linecap="round"/>`,
    `<path class="viz-gauge-value" d="${arcPath(cx, cy, radius, startAngle, Math.max(startAngle + 0.01, valueAngle))}" fill="none" stroke="${color}" stroke-width="12" stroke-linecap="round"/>`,
    `<line class="viz-gauge-needle" x1="${num(cx)}" y1="${num(cy)}" x2="${num(needleX)}" y2="${num(needleY)}" stroke="${palette.ink}" stroke-width="2" stroke-linecap="round"/>`,
    `<circle cx="${num(cx)}" cy="${num(cy)}" r="4" fill="${palette.gold}"/>`,
    `<text class="viz-gauge-score" x="${num(cx)}" y="${num(cy + radius * 0.5)}" text-anchor="middle" fill="${palette.inkStrong}" font-size="${num(Math.max(18, size * 0.2))}" font-weight="600">${escapeXml(String(Math.round(safeScore)))}</text>`,
    `<text class="viz-gauge-unit" x="${num(cx)}" y="${num(cy + radius * 0.5 + 20)}" text-anchor="middle" fill="${palette.inkSoft}" font-size="11">${escapeXml(`${label} · 满分 100`)}</text>`,
    `<text x="${num(startX - 6)}" y="${num(startY + 12)}" text-anchor="middle" fill="${palette.inkSoft}" font-size="10">0</text>`,
    `<text x="${num(endX + 6)}" y="${num(endY + 12)}" text-anchor="middle" fill="${palette.inkSoft}" font-size="10">100</text>`,
    '</g>',
  ].join('\n');

  return svgFrame(
    {
      width,
      height,
      title,
      desc: opts.desc ?? `${label} ${Math.round(safeScore)} 分（满分 100）`,
      ariaLabel: `${title}：${label} ${Math.round(safeScore)} 分（满分 100）`,
    },
    body,
  );
}
