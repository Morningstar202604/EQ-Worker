import { escapeXml } from './escape';
import { palette } from './palette';
import { compareText, emptyFrame, finiteNumber, formatNumber, num, svgFrame, truncateText } from './svg';

export type FlowDirection = 'in' | 'out';

export interface FlowRow {
  label: string;
  value: number;
  dir: FlowDirection;
}

export interface FlowOptions {
  width?: number;
  height?: number;
  title?: string;
  desc?: string;
  unit?: string;
}

const DEFAULT_WIDTH = 460;
const DEFAULT_ROW_HEIGHT = 34;
const DEFAULT_HEIGHT = 260;

export function flowSvg(rows: readonly FlowRow[], opts: FlowOptions = {}): string {
  const title = opts.title ?? '收支流向';
  const unit = opts.unit ?? '元';
  const clean = (rows ?? []).map((row) => ({
    label: String(row?.label ?? ''),
    value: Math.abs(finiteNumber(row?.value, 0)),
    dir: row?.dir === 'out' ? ('out' as const) : ('in' as const),
  }));
  const visible = clean.filter((row) => row.value > 0);
  const width = Math.max(280, finiteNumber(opts.width, DEFAULT_WIDTH));
  const neededHeight = 74 + Math.max(visible.length, 1) * DEFAULT_ROW_HEIGHT;
  const height = Math.max(170, neededHeight, finiteNumber(opts.height, DEFAULT_HEIGHT));

  if (visible.length === 0) {
    return emptyFrame(width, height, '暂无收支数据', title);
  }

  const sorted = [...visible].sort((a, b) => b.value - a.value || compareText(a.label, b.label));
  const maxValue = Math.max(...sorted.map((row) => row.value));
  const labelWidth = 92;
  const amountWidth = 84;
  const plotLeft = labelWidth;
  const plotRight = width - amountWidth - 12;
  const plotWidth = Math.max(24, plotRight - plotLeft);
  const rowHeight = Math.min(DEFAULT_ROW_HEIGHT, (height - 54) / sorted.length);
  const barHeight = Math.max(10, rowHeight * 0.5);
  const startY = 40;

  const rowsMarkup = sorted
    .map((row, index) => {
      const y = startY + index * rowHeight;
      const barWidth = Math.max(2, (row.value / maxValue) * plotWidth);
      const color = row.dir === 'in' ? palette.teal : palette.gold;
      const directionLabel = row.dir === 'in' ? '收' : '支';
      return [
        `<text class="viz-flow-label" x="${num(plotLeft - 10)}" y="${num(y + barHeight / 2)}" text-anchor="end" dominant-baseline="middle" fill="${palette.ink}" font-size="12">${escapeXml(truncateText(row.label, 7))}</text>`,
        `<rect class="viz-flow-bar" x="${num(plotLeft)}" y="${num(y)}" width="${num(barWidth)}" height="${num(barHeight)}" rx="3" fill="${color}" fill-opacity="${row.dir === 'in' ? 0.7 : 0.5}"/>`,
        `<text class="viz-flow-value" x="${num(plotRight + 8)}" y="${num(y + barHeight / 2)}" dominant-baseline="middle" fill="${palette.inkSoft}" font-size="11">${escapeXml(`${directionLabel} ${formatNumber(row.value)} ${unit}`)}</text>`,
      ].join('\n');
    })
    .join('\n');

  const totalIn = sorted.filter((row) => row.dir === 'in').reduce((sum, row) => sum + row.value, 0);
  const totalOut = sorted.filter((row) => row.dir === 'out').reduce((sum, row) => sum + row.value, 0);
  const net = totalIn - totalOut;
  const summary = `收 ${formatNumber(totalIn)} ${unit}、支 ${formatNumber(totalOut)} ${unit}、净 ${formatNumber(net)} ${unit}`;

  const footer = `<text class="viz-flow-summary" x="${num(plotLeft)}" y="${num(height - 14)}" fill="${palette.inkSoft}" font-size="11">${escapeXml(summary)}</text>`;

  const legendY = 18;
  const legend = [
    `<rect x="${num(plotLeft)}" y="${num(legendY - 5)}" width="12" height="10" rx="2" fill="${palette.teal}" fill-opacity="0.7"/>`,
    `<text x="${num(plotLeft + 18)}" y="${num(legendY)}" dominant-baseline="middle" fill="${palette.inkSoft}" font-size="11">收</text>`,
    `<rect x="${num(plotLeft + 48)}" y="${num(legendY - 5)}" width="12" height="10" rx="2" fill="${palette.gold}" fill-opacity="0.5"/>`,
    `<text x="${num(plotLeft + 66)}" y="${num(legendY)}" dominant-baseline="middle" fill="${palette.inkSoft}" font-size="11">支</text>`,
  ].join('\n');

  const body = ['<g class="viz-flow">', legend, rowsMarkup, footer, '</g>'].join('\n');

  return svgFrame(
    {
      width,
      height,
      title,
      desc: opts.desc ?? `${title}：${summary}`,
      ariaLabel: `${title}：${summary}；${sorted.map((row) => `${row.label}${row.dir === 'in' ? '收' : '支'}${formatNumber(row.value)}`).join('，')}`,
    },
    body,
  );
}
