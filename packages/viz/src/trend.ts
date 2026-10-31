import { escapeXml } from './escape';
import { palette } from './palette';
import { clampNumber, emptyFrame, finiteNumber, num, svgFrame, truncateText } from './svg';

export interface TrendPoint {
  label: string;
  given: number;
  received: number;
}

export interface TrendOptions {
  width?: number;
  height?: number;
  title?: string;
  desc?: string;
}

const DEFAULT_WIDTH = 560;
const DEFAULT_HEIGHT = 300;

interface Scale {
  min: number;
  max: number;
  y: (value: number) => number;
}

function niceStep(range: number): number {
  if (!Number.isFinite(range) || range <= 0) return 1;
  const raw = range / 4;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const normalized = raw / magnitude;
  const factor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return factor * magnitude;
}

function createScale(values: number[], top: number, bottom: number): Scale {
  const finite = values.filter((value) => Number.isFinite(value));
  let dataMin = finite.length ? Math.min(...finite, 0) : 0;
  let dataMax = finite.length ? Math.max(...finite, 0) : 0;
  if (dataMin === dataMax) {
    if (dataMin === 0) dataMax = 1;
    else if (dataMin > 0) dataMin = 0;
    else dataMax = 0;
  }
  const step = niceStep(dataMax - dataMin);
  const min = Math.floor(dataMin / step) * step;
  const max = Math.ceil(dataMax / step) * step;
  const span = max - min || 1;
  return {
    min,
    max,
    y: (value: number) => bottom - ((clampNumber(finiteNumber(value, 0), min, max) - min) / span) * (bottom - top),
  };
}

function niceTicks(scale: Scale): number[] {
  const step = niceStep(scale.max - scale.min);
  const ticks: number[] = [];
  for (let value = scale.min; value <= scale.max + step / 2; value += step) {
    ticks.push(Math.round(value * 1000) / 1000);
  }
  return ticks;
}

function legendItem(x: number, y: number, color: string, label: string, kind: 'line' | 'bar'): string {
  const swatch =
    kind === 'line'
      ? `<line x1="${num(x)}" y1="${num(y)}" x2="${num(x + 16)}" y2="${num(y)}" stroke="${color}" stroke-width="2" stroke-linecap="round"/><circle cx="${num(x + 8)}" cy="${num(y)}" r="2.5" fill="${color}"/>`
      : `<rect x="${num(x)}" y="${num(y - 5)}" width="16" height="10" rx="2" fill="${color}" fill-opacity="0.75"/>`;
  return `${swatch}<text x="${num(x + 22)}" y="${num(y)}" dominant-baseline="middle" fill="${palette.inkSoft}" font-size="11">${escapeXml(label)}</text>`;
}

export function trendSvg(points: readonly TrendPoint[], opts: TrendOptions = {}): string {
  const width = Math.max(280, finiteNumber(opts.width, DEFAULT_WIDTH));
  const height = Math.max(200, finiteNumber(opts.height, DEFAULT_HEIGHT));
  const title = opts.title ?? '人情往来趋势';
  const rows = (points ?? []).map((point) => ({
    label: String(point?.label ?? ''),
    given: finiteNumber(point?.given, 0),
    received: finiteNumber(point?.received, 0),
  }));

  if (rows.length === 0) {
    return emptyFrame(width, height, '暂无趋势数据', title);
  }

  const padding = { top: 46, right: 24, bottom: 46, left: 52 };
  const plotLeft = padding.left;
  const plotRight = width - padding.right;
  const plotTop = padding.top;
  const plotBottom = height - padding.bottom;
  const scale = createScale(
    rows.flatMap((row) => [row.given, row.received]),
    plotTop,
    plotBottom,
  );

  const slot = (plotRight - plotLeft) / rows.length;
  const barWidth = clampNumber(slot * 0.36, 4, 26);
  const zeroY = scale.y(0);

  const grid = niceTicks(scale)
    .map((tick) => {
      const y = scale.y(tick);
      return [
        `<line class="viz-trend-grid" x1="${num(plotLeft)}" y1="${num(y)}" x2="${num(plotRight)}" y2="${num(y)}" stroke="${palette.line}" stroke-opacity="0.22" stroke-width="1"/>`,
        `<text x="${num(plotLeft - 8)}" y="${num(y)}" text-anchor="end" dominant-baseline="middle" fill="${palette.inkSoft}" font-size="10">${escapeXml(String(Math.round(tick * 10) / 10))}</text>`,
      ].join('\n');
    })
    .join('\n');

  const bars = rows
    .map((row, index) => {
      const center = plotLeft + slot * (index + 0.5);
      const valueY = scale.y(row.given);
      const top = Math.min(valueY, zeroY);
      const barHeight = Math.max(1, Math.abs(zeroY - valueY));
      return `<rect class="viz-trend-bar" x="${num(center - barWidth / 2)}" y="${num(top)}" width="${num(barWidth)}" height="${num(barHeight)}" rx="2" fill="${palette.gold}" fill-opacity="0.55"/>`;
    })
    .join('\n');

  const linePoints = rows
    .map((row, index) => {
      const center = plotLeft + slot * (index + 0.5);
      return `${num(center)},${num(scale.y(row.received))}`;
    })
    .join(' ');

  const dots = rows
    .map((row, index) => {
      const center = plotLeft + slot * (index + 0.5);
      return `<circle class="viz-trend-dot" cx="${num(center)}" cy="${num(scale.y(row.received))}" r="3" fill="${palette.paper}" stroke="${palette.teal}" stroke-width="2"/>`;
    })
    .join('\n');

  const labelStep = Math.ceil(rows.length / 8);
  const xLabels = rows
    .map((row, index) => {
      if (index % labelStep !== 0 && index !== rows.length - 1) return '';
      const center = plotLeft + slot * (index + 0.5);
      return `<text class="viz-trend-xlabel" x="${num(center)}" y="${num(plotBottom + 18)}" text-anchor="middle" fill="${palette.inkSoft}" font-size="10">${escapeXml(truncateText(row.label, 6))}</text>`;
    })
    .filter(Boolean)
    .join('\n');

  const summary = rows
    .slice(-3)
    .map((row) => `${row.label} 给出 ${Math.round(row.given)} / 收到 ${Math.round(row.received)}`)
    .join('；');
  const body = [
    '<g class="viz-trend">',
    legendItem(plotLeft, 20, palette.gold, '给出', 'bar'),
    legendItem(plotLeft + 76, 20, palette.teal, '收到', 'line'),
    grid,
    `<line class="viz-trend-baseline" x1="${num(plotLeft)}" y1="${num(zeroY)}" x2="${num(plotRight)}" y2="${num(zeroY)}" stroke="${palette.line}" stroke-opacity="0.6" stroke-width="1"/>`,
    bars,
    `<polyline class="viz-trend-line" points="${linePoints}" fill="none" stroke="${palette.teal}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`,
    dots,
    xLabels,
    '</g>',
  ]
    .filter(Boolean)
    .join('\n');

  return svgFrame(
    {
      width,
      height,
      title,
      desc: opts.desc ?? `人情往来趋势：${summary}`,
      ariaLabel: `${title}：${summary}`,
    },
    body,
  );
}
