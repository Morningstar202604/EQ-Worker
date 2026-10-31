import { escapeHtml, money } from './html';

export interface LedgerPersonRow {
  id: string;
  name: string;
  given: number;
  received: number;
  net: number;
  netLabel: string;
  status: 'owe' | 'due' | 'clear';
}

export interface LedgerInsightView {
  monthGiven: number;
  monthReceived: number;
  monthCount: number;
  avgGiven: number;
  maxGift: number;
  topOccasion: string;
  topOccasionAmount: number;
}

export interface LedgerData {
  totals: { given: number; received: number; net: number; owe: number; due: number; oweCount: number; dueCount: number };
  flowSvg: string;
  flowLabel: string;
  insights: LedgerInsightView;
  rows: LedgerPersonRow[];
}

export function renderLedger(data: LedgerData): string {
  const rows = data.rows.length
    ? data.rows
        .map(
          (row) => [
            '<tr>',
            `<td><button type="button" class="linklike" data-act="person-open" data-id="${escapeHtml(row.id)}" aria-label="查看 ${escapeHtml(row.name)} 的详情">${escapeHtml(row.name)}</button></td>`,
            `<td>${escapeHtml(money(row.given))}</td>`,
            `<td>${escapeHtml(money(row.received))}</td>`,
            `<td class="status-${row.status}">${escapeHtml(row.netLabel)}</td>`,
            '</tr>'
          ].join('')
        )
        .join('\n')
    : '<tr><td colspan="4" class="muted center">还没有账本记录</td></tr>';

  const insightCards = [
    { label: '本月给出', value: money(data.insights.monthGiven), hint: `${data.insights.monthCount} 笔往来` },
    { label: '本月收到', value: money(data.insights.monthReceived), hint: '按月统计' },
    { label: '平均礼金', value: money(data.insights.avgGiven), hint: '按累计给出计算' },
    { label: '最大单笔', value: money(data.insights.maxGift), hint: '单次给出的最高金额' }
  ]
    .map(
      (card) =>
        `<div class="insight"><span class="insight-label">${escapeHtml(card.label)}</span><strong>${escapeHtml(card.value)}</strong><span class="insight-hint">${escapeHtml(card.hint)}</span></div>`
    )
    .join('');

  const topOccasion = data.insights.topOccasion
    ? `<p class="muted">最常给出的场合：<strong>${escapeHtml(data.insights.topOccasion)}</strong>（${escapeHtml(money(data.insights.topOccasionAmount))}）</p>`
    : '<p class="muted">还没有可统计的礼金场合。</p>';

  return [
    '<section class="view ledger" aria-labelledby="ledger-title">',
    '<header class="view-head">',
    '<div>',
    '<p class="eyebrow">账本</p>',
    '<h1 id="ledger-title">人情账本</h1>',
    `<p class="muted">${escapeHtml(data.insights.topOccasion ? `本月的重点场合是「${data.insights.topOccasion}」` : '账目一目了然')}</p>`,
    '</div>',
    '</header>',
    '<div class="totals">',
    `<div class="total"><span>累计给出</span><strong>${escapeHtml(money(data.totals.given))}</strong></div>`,
    `<div class="total"><span>累计收到</span><strong>${escapeHtml(money(data.totals.received))}</strong></div>`,
    `<div class="total"><span>净额</span><strong class="${data.totals.net >= 0 ? 'pos' : 'neg'}">${escapeHtml(money(data.totals.net))}</strong></div>`,
    `<div class="total"><span>我欠 ${data.totals.oweCount} 人</span><strong>${escapeHtml(money(data.totals.owe))}</strong></div>`,
    `<div class="total"><span>应收 ${data.totals.dueCount} 人</span><strong>${escapeHtml(money(data.totals.due))}</strong></div>`,
    '</div>',
    '<div class="ledger-mid">',
    `<figure class="chart flow" role="img" aria-label="${escapeHtml(data.flowLabel)}">${data.flowSvg}</figure>`,
    '<div class="card insights-card">',
    '<h2>账本洞察</h2>',
    `<div class="insights">${insightCards}</div>`,
    topOccasion,
    '</div>',
    '</div>',
    '<section class="card table-card" aria-labelledby="totals-title">',
    '<h2 id="totals-title">每人净额</h2>',
    '<table class="data-table">',
    '<thead><tr><th scope="col">姓名</th><th scope="col">累计给出</th><th scope="col">累计收到</th><th scope="col">净额</th></tr></thead>',
    `<tbody>${rows}</tbody>`,
    '</table>',
    '</section>',
    '</section>'
  ].join('\n');
}
