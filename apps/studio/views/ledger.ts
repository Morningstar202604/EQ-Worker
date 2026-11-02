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

export interface RelationshipInsightRow {
  id: string;
  name: string;
  score: number;
  level: string;
  cls: string;
  netLabel: string;
  lastDays: number | null;
}

export interface RelationshipInsightsView {
  networkSvg: string;
  networkLabel: string;
  trendSvg: string;
  trendLabel: string;
  ranking: RelationshipInsightRow[];
  nodeCount: number;
  linkCount: number;
}

export interface LedgerData {
  totals: { given: number; received: number; net: number; owe: number; due: number; oweCount: number; dueCount: number };
  flowSvg: string;
  flowLabel: string;
  insights: LedgerInsightView;
  relationship: RelationshipInsightsView;
  rows: LedgerPersonRow[];
  achievements: AchievementView[];
  annual: AnnualView;
}

export interface AchievementView {
  t: string;
  d: string;
  cur: number;
  need: number;
  done: boolean;
}

export interface AnnualView {
  months: { label: string; count: number }[];
  total: number;
  peak: number;
  bestMonths: string[];
  topPersons: { name: string; count: number }[];
  topDebts: { name: string; debt: number }[];
  keywords: string[];
}

function renderRelationshipInsights(data: RelationshipInsightsView): string {
  const rows = data.ranking.length
    ? data.ranking
        .map(
          (row) => [
            '<tr>',
            `<td><button type="button" class="linklike" data-act="person-open" data-id="${escapeHtml(row.id)}" aria-label="查看 ${escapeHtml(row.name)} 的详情">${escapeHtml(row.name)}</button></td>`,
            `<td><span class="health-dot ${escapeHtml(row.cls)}" aria-hidden="true"></span>${escapeHtml(row.level)}</td>`,
            `<td>${row.score}</td>`,
            `<td>${escapeHtml(row.netLabel)}</td>`,
            `<td class="muted">${row.lastDays === null ? '还没有往来' : `${row.lastDays} 天前`}</td>`,
            '</tr>'
          ].join('')
        )
        .join('\n')
    : '<tr><td colspan="5" class="muted center">还没有人脉数据</td></tr>';

  return [
    '<details class="relationship-insights" aria-labelledby="relationship-insights-title">',
    '<summary class="relationship-insights-summary">',
    '<span><strong id="relationship-insights-title">关系洞察</strong><span class="muted">网络、趋势与健康排行</span></span>',
    '<span class="relationship-insights-toggle" aria-hidden="true">展开</span>',
    '</summary>',
    '<div class="relationship-insights-body">',
    `<p class="muted">${data.nodeCount} 个节点 · ${data.linkCount} 条边（按往来金额加权）</p>`,
    '<div class="insights-grid">',
    `<figure class="chart network" role="img" aria-label="${escapeHtml(data.networkLabel)}">${data.networkSvg}</figure>`,
    `<figure class="chart trend" role="img" aria-label="${escapeHtml(data.trendLabel)}">${data.trendSvg}</figure>`,
    '</div>',
    '<section class="card table-card" aria-labelledby="ranking-title">',
    '<h2 id="ranking-title">关系健康排行</h2>',
    '<table class="data-table">',
    '<thead><tr><th scope="col">姓名</th><th scope="col">状态</th><th scope="col">分数</th><th scope="col">账本净额</th><th scope="col">最后往来</th></tr></thead>',
    `<tbody>${rows}</tbody>`,
    '</table>',
    '</section>',
    '</div>',
    '</details>'
  ].join('\n');
}

function renderAchievements(list: AchievementView[]): string {
  const got = list.filter((x) => x.done).length;
  const items = list
    .map((x) =>
      [
        `<li class="badge${x.done ? ' done' : ''}">`,
        `<span class="badge-mark" aria-hidden="true">${x.done ? '🏅' : '🔒'}</span>`,
        `<div class="badge-body">`,
        `<strong>${escapeHtml(x.t)}</strong>`,
        `<span class="muted tiny">${escapeHtml(x.d)}</span>`,
        `</div>`,
        `<span class="badge-progress">${x.done ? '已达成' : `${x.cur}/${x.need}`}</span>`,
        `</li>`
      ].join('')
    )
    .join('');
  return [
    '<section class="card achievements-card" aria-labelledby="achievements-title">',
    '<div class="card-head">',
    `<h2 id="achievements-title">成就徽章</h2>`,
    `<span class="muted small">${got} / ${list.length} 已达成</span>`,
    '</div>',
    '<p class="muted small">用真实往来解锁徽章：记录、走动、修炼、还清人情，都会留下痕迹。</p>',
    `<ul class="badge-grid">${items}</ul>`,
    '</section>'
  ].join('');
}

function renderAnnual(a: AnnualView): string {
  const bars = a.months
    .map((m) => {
      const h = Math.max(4, Math.round((m.count / a.peak) * 64));
      return [
        '<div class="annual-bar">',
        `<span class="annual-bar-fill" style="height:${h}px" title="${escapeHtml(m.label)}：${m.count} 笔"></span>`,
        `<span class="annual-bar-label">${escapeHtml(m.label)}</span>`,
        '</div>'
      ].join('');
    })
    .join('');
  const tops = a.topPersons.length
    ? a.topPersons.map((p) => `<span class="chip">${escapeHtml(p.name)} ${p.count} 笔</span>`).join('')
    : '<span class="chip">暂无</span>';
  const debts = a.topDebts.length
    ? a.topDebts.map((d) => `<span class="chip">${escapeHtml(d.name)} ${Math.round(d.debt)}</span>`).join('')
    : '<span class="chip">暂无欠债</span>';
  const kw = a.keywords.map((k) => `<li>${escapeHtml(k)}</li>`).join('');
  return [
    '<section class="card annual-card" aria-labelledby="annual-title">',
    '<div class="card-head">',
    `<h2 id="annual-title">近 12 个月回顾</h2>`,
    `<span class="muted small">共 ${a.total} 笔往来</span>`,
    '</div>',
    `<div class="annual-bars" role="img" aria-label="近 12 个月往来笔数柱状图">${bars}</div>`,
    a.total > 0 ? `<p class="muted small">走动最多的月份：${escapeHtml(a.bestMonths.join('、'))}</p>` : '',
    '<div class="annual-row"><span class="muted small">最常走动</span><div class="chips">' + tops + '</div></div>',
    '<div class="annual-row"><span class="muted small">人情债前三</span><div class="chips">' + debts + '</div></div>',
    `<ul class="annual-keywords">${kw}</ul>`,
    '</section>'
  ].join('');
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
    '<p class="eyebrow">账本与洞察</p>',
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
    renderRelationshipInsights(data.relationship),
    renderAchievements(data.achievements),
    renderAnnual(data.annual),
    '</section>'
  ].join('\n');
}
