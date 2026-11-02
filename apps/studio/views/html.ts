import { escapeXml } from '../../../packages/viz/src/index';
import { fmtMoney } from '../../../packages/core/src/index';

export const escapeHtml = escapeXml;

export function money(value: number): string {
  return fmtMoney(value);
}

export function lastSeen(days: number | null): string {
  if (days === null) return '还没有往来';
  if (days === 0) return '今天有往来';
  return `${days} 天前`;
}

/** 把任意数值收敛到 0–100 的整数百分比，供进度条/仪表类展示使用。 */
export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}
