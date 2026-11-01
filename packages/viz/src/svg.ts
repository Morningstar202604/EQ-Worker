import { escapeXml } from './escape';
import { palette } from './palette';

export interface SvgFrameOptions {
  width: number;
  height: number;
  title: string;
  desc: string;
  ariaLabel: string;
}

export function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function finiteNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function roundNumber(value: number, digits = 2): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** digits;
  const rounded = Math.round(value * factor) / factor;
  return Object.is(rounded, -0) ? 0 : rounded;
}

export function num(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return '0';
  return String(roundNumber(value, digits));
}

export function compareText(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export function truncateText(value: string, maxLength: number): string {
  const chars = Array.from(value);
  if (chars.length <= maxLength) return value;
  return `${chars.slice(0, Math.max(1, maxLength - 1)).join('')}…`;
}

export function formatNumber(value: number): string {
  const safe = finiteNumber(value, 0);
  const rounded = roundNumber(safe, 1);
  const sign = rounded < 0 ? '-' : '';
  const [integer, fraction] = String(Math.abs(rounded)).split('.');
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}${grouped}${fraction ? `.${fraction}` : ''}`;
}

export function svgFrame(options: SvgFrameOptions, body: string): string {
  const width = Math.max(1, roundNumber(options.width, 0));
  const height = Math.max(1, roundNumber(options.height, 0));
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" role="img" width="100%" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" font-family="Georgia, 'Songti SC', 'Noto Serif SC', serif" aria-label="${escapeXml(options.ariaLabel)}">`,
    `<title>${escapeXml(options.title)}</title>`,
    `<desc>${escapeXml(options.desc)}</desc>`,
    body,
    '</svg>',
  ].join('\n');
}

export function emptyFrame(width: number, height: number, message: string, title: string, desc = message): string {
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.max(28, Math.min(width, height) * 0.16);
  const body = [
    `<circle cx="${num(cx)}" cy="${num(cy)}" r="${num(radius)}" fill="none" stroke="${palette.line}" stroke-opacity="0.28" stroke-width="1" stroke-dasharray="4 7"/>`,
    `<text x="${num(cx)}" y="${num(cy)}" text-anchor="middle" dominant-baseline="middle" fill="${palette.inkSoft}" font-size="13">${escapeXml(message)}</text>`,
  ].join('\n');
  return svgFrame(
    {
      width,
      height,
      title,
      desc,
      ariaLabel: `${title}：${message}`,
    },
    body,
  );
}
