import { escapeXml } from '../../../packages/viz/src/index';
import { fmtMoney } from '../../../packages/core/src/index';

export const escapeHtml = escapeXml;

export function money(value: number): string {
  return fmtMoney(value);
}

export function shortDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function lastSeen(days: number | null): string {
  if (days === null) return '还没有往来';
  if (days === 0) return '今天有往来';
  return `${days} 天前`;
}

export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}
