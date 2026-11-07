import { fmtDate } from './date';
import { fmtMoneyCN } from './ledger';
import { EVENT_TYPES } from './constants';
import { eventDir } from './ledger';
import type { AppState } from './types';

/** CSV 字段转义：含逗号、引号、换行的字段用双引号包裹并翻倍内部引号。 */
function csvField(v: unknown): string {
  const s = String(v ?? '');
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * 往来明细礼簿（事件级 CSV）。
 *
 * 为什么独立于人员汇总导出：婚礼收礼台、年底对账、纸质归档要的是
 * 「每一笔」的流水单，不是每个人的合计。同类成熟实现（gift-book、
 * RenqingLedger 的礼簿导出）都以此为标配，并且大写金额是单据防篡改的
 * 硬需求，随数据一起给出。
 *
 * 返回值不含 BOM：写文件的调用方按需加（Excel 需要），字符串消费方不要。
 */
export function ledgerCsv(state: AppState, now: number = Date.now()): string {
  const header = ['日期', '姓名', '身份', '类型', '场合', '方向', '金额(元)', '金额大写', '备注'];
  const persons = new Map(state.persons.map((p) => [p.id, p]));
  const rows: string[] = [header.join(',')];
  const events = state.events
    .filter((e) => e.time <= now)
    .slice()
    .sort((a, b) => a.time - b.time);
  for (const e of events) {
    const p = persons.get(e.personId);
    const dir = eventDir(e);
    const dirLabel = dir === 'out' ? '送出' : dir === 'in' ? '收到' : '—';
    const amt = Number(e.amount) || 0;
    rows.push([
      fmtDate(e.time),
      p ? p.name : '（已删除）',
      p ? p.identity : '',
      EVENT_TYPES[e.type]?.label ?? e.type,
      e.occasion || '',
      dirLabel,
      amt > 0 ? String(amt) : '',
      amt > 0 ? fmtMoneyCN(amt) : '',
      e.note || ''
    ].map(csvField).join(','));
  }
  return rows.join('\r\n');
}
