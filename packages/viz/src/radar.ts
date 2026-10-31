import { escapeXml } from './escape';
import { palette } from './palette';
import { clampNumber, emptyFrame, finiteNumber, num, svgFrame, truncateText } from './svg';

export interface RadarDatum {
  label: string;
  value: number;
}

export interface RadarOptions {
  width?: number;
  height?: number;
  title?: string;
  desc?: string;
  levels?: number;
  showValues?: boolean;
}

const DEFAULT_WIDTH = 360;
const DEFAULT_HEIGHT = 360;
const MAX_SCORE = 100;

function pointAt(cx: number, cy: number, radius: number, index: number, count: number): [number, number] {
  const angle = -Math.PI / 2 + (index * Math.PI * 2) / count;
  return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
}

function polygonPoints(values: number[], radius: number, cx: number, cy: number): string {
  return values
    .map((value, index) => {
      const [x, y] = pointAt(cx, cy, (radius * value) / MAX_SCORE, index, values.length);
      return `${num(x)},${num(y)}`;
    })
    .join(' ');
}

export function radarSvg(data: readonly RadarDatum[], opts: RadarOptions = {}): string {
  const width = Math.max(200, finiteNumber(opts.width, DEFAULT_WIDTH));
  const height = Math.max(200, finiteNumber(opts.height, DEFAULT_HEIGHT));
  const title = opts.title ?? '关系维度雷达图';
  const levels = Math.max(1, Math.min(10, Math.round(finiteNumber(opts.levels, 5))));
  const showValues = opts.showValues ?? true;
  const rows = (data ?? []).map((item) => ({
    label: String(item?.label ?? ''),
    value: clampNumber(finiteNumber(item?.value, 0), 0, MAX_SCORE),
  }));

  if (rows.length === 0) {
    return emptyFrame(width, height, '暂无雷达数据', title);
  }

  const values = rows.map((row) => row.value);
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.max(24, Math.min(width, height) / 2 - 76);
  const allZero = values.every((value) => value === 0);

  const grid: string[] = [];
  for (let level = 1; level <= levels; level += 1) {
    const ringRadius = (radius * level) / levels;
    if (rows.length >= 3) {
      grid.push(
        `<polygon class="viz-radar-grid" points="${polygonPoints(values.map(() => (level / levels) * MAX_SCORE), radius, cx, cy)}" fill="none" stroke="${palette.line}" stroke-opacity="${level === levels ? 0.45 : 0.22}" stroke-width="1"/>`,
      );
    } else {
      grid.push(
        `<circle class="viz-radar-grid" cx="${num(cx)}" cy="${num(cy)}" r="${num(ringRadius)}" fill="none" stroke="${palette.line}" stroke-opacity="${level === levels ? 0.45 : 0.22}" stroke-width="1"/>`,
      );
    }
  }

  const spokes = rows
    .map((_, index) => {
      const [x, y] = pointAt(cx, cy, radius, index, rows.length);
      return `<line class="viz-radar-spoke" x1="${num(cx)}" y1="${num(cy)}" x2="${num(x)}" y2="${num(y)}" stroke="${palette.line}" stroke-opacity="0.2" stroke-width="1"/>`;
    })
    .join('\n');

  const shape =
    rows.length >= 3
      ? `<polygon class="viz-radar-area" points="${polygonPoints(values, radius, cx, cy)}" fill="${palette.teal}" fill-opacity="0.16" stroke="${palette.teal}" stroke-width="1.8" stroke-linejoin="round"/>`
      : '';

  const dots = rows
    .map((row, index) => {
      const [x, y] = pointAt(cx, cy, (radius * row.value) / MAX_SCORE, index, rows.length);
      return `<circle class="viz-radar-dot" cx="${num(x)}" cy="${num(y)}" r="3" fill="${palette.teal}"/>`;
    })
    .join('\n');

  const labels = rows
    .map((row, index) => {
      const [x, y] = pointAt(cx, cy, radius + 22, index, rows.length);
      const cos = Math.cos(-Math.PI / 2 + (index * Math.PI * 2) / rows.length);
      const anchor = Math.abs(cos) < 0.25 ? 'middle' : cos > 0 ? 'start' : 'end';
      const text = showValues ? `${truncateText(row.label, 8)} ${Math.round(row.value)}` : truncateText(row.label, 8);
      return `<text class="viz-radar-label" x="${num(x)}" y="${num(y)}" text-anchor="${anchor}" dominant-baseline="middle" fill="${palette.inkSoft}" font-size="12">${escapeXml(text)}</text>`;
    })
    .join('\n');

  const scaleLabels =
    rows.length >= 3
      ? [100, 50, 0]
          .map((tick) => {
            const y = cy - (radius * tick) / MAX_SCORE;
            return `<text class="viz-radar-scale" x="${num(cx + 6)}" y="${num(y)}" dominant-baseline="middle" fill="${palette.inkSoft}" fill-opacity="0.6" font-size="9">${tick}</text>`;
          })
          .join('\n')
      : '';

  const zeroNote = allZero
    ? `<text class="viz-empty-note" x="${num(cx)}" y="${num(cy + 18)}" text-anchor="middle" fill="${palette.inkSoft}" font-size="12">暂无评分</text>`
    : '';

  const summary = rows.map((row) => `${row.label} ${Math.round(row.value)} 分`).join('、');
  const body = [`<g class="viz-radar">`, grid.join('\n'), spokes, shape, dots, labels, scaleLabels, zeroNote, '</g>']
    .filter(Boolean)
    .join('\n');

  return svgFrame(
    {
      width,
      height,
      title,
      desc: opts.desc ?? `雷达图：${summary}`,
      ariaLabel: `${title}：${summary}`,
    },
    body,
  );
}
