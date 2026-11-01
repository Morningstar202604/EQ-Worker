import { escapeHtml, lastSeen } from './html';

export interface ChartBlock {
  svg: string;
  label: string;
}

export function chartBlock(chart: ChartBlock, extraClass = ''): string {
  return `<figure class="chart ${extraClass}" role="img" aria-label="${escapeHtml(chart.label)}">${chart.svg}</figure>`;
}

export function metricCard(label: string, value: number, hint: string): string {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return [
    `<div class="metric">`,
    `<div class="metric-head"><span>${escapeHtml(label)}</span><strong>${pct}</strong></div>`,
    `<div class="meter" aria-hidden="true"><span style="width:${pct}%"></span></div>`,
    `<p class="metric-hint">${escapeHtml(hint)}</p>`,
    `</div>`
  ].join('');
}

export interface OverviewAction {
  key: string;
  title: string;
  reason: string;
  tone: string;
  personId: string;
  primaryLabel: string;
  secondaryLabel: string;
  primaryAct: string;
  primaryArg: string;
  secondaryAct: string;
  secondaryArg: string;
}

export interface OverviewData {
  index: number;
  scale: number;
  heatAvg: number;
  freq: number;
  credit: number;
  wisdom: number;
  radarSvg: string;
  radarLabel: string;
  gaugeSvg: string;
  gaugeLabel: string;
  actions: OverviewAction[];
  alerts: string[];
  personCount: number;
  eventCount: number;
  topPerson: { id: string; name: string; heat: number; lastDays: number | null } | null;
}

export function renderOverview(data: OverviewData): string {
  const metrics = [
    metricCard('人情规模', data.scale, '人脉数量折算的关系盘面大小'),
    metricCard('关系热度', data.heatAvg, '所有关系的平均热度'),
    metricCard('往来频率', data.freq, '近 30 天往来活跃度'),
    metricCard('人情信用', data.credit, '人情债越低，信用越高'),
    metricCard('世故智慧', data.wisdom, '情景训练累积的分数')
  ].join('\n');

  const actions = data.actions.length
    ? data.actions
        .map(
          (action) => [
            `<li class="action tone-${escapeHtml(action.tone)}" data-key="${escapeHtml(action.key)}">`,
            `<div class="action-main">`,
            `<h3>${escapeHtml(action.title)}</h3>`,
            `<p>${escapeHtml(action.reason)}</p>`,
            `</div>`,
            `<div class="action-buttons">`,
            `<button type="button" class="btn small primary" data-act="action-primary" data-key="${escapeHtml(action.key)}" data-person="${escapeHtml(action.personId)}" data-action="${escapeHtml(action.primaryAct)}" data-arg="${escapeHtml(action.primaryArg)}" aria-label="${escapeHtml(`执行：${action.primaryLabel}`)}">${escapeHtml(action.primaryLabel)}</button>`,
            action.secondaryLabel
              ? `<button type="button" class="btn small ghost" data-act="action-secondary" data-key="${escapeHtml(action.key)}" data-person="${escapeHtml(action.personId)}" data-action="${escapeHtml(action.secondaryAct)}" data-arg="${escapeHtml(action.secondaryArg)}" aria-label="${escapeHtml(`次要操作：${action.secondaryLabel}`)}">${escapeHtml(action.secondaryLabel)}</button>`
              : '',
            `</div>`,
            `</li>`
          ].join('')
        )
        .join('\n')
    : '<li class="action-empty">近期没有需要立刻处理的事，保持节奏就好。</li>';

  const alerts = data.alerts.length
    ? `<ul class="alerts">${data.alerts
        .map((alert) => `<li>${escapeHtml(alert)}</li>`)
        .join('')}</ul>`
    : '<p class="muted">暂时没有提醒。</p>';

  const top = data.topPerson
    ? [
        `<button type="button" class="top-person" data-act="person-open" data-id="${escapeHtml(data.topPerson.id)}" aria-label="查看 ${escapeHtml(data.topPerson.name)} 的详情">`,
        `<span class="top-name">${escapeHtml(data.topPerson.name)}</span>`,
        `<span class="top-meta">热度 ${Math.round(data.topPerson.heat)} · ${escapeHtml(lastSeen(data.topPerson.lastDays))}</span>`,
        `</button>`
      ].join('')
    : '<p class="muted">还没有人脉。</p>';

  return [
    '<section class="view overview" aria-labelledby="overview-title">',
    '<header class="view-head">',
    '<div>',
    '<p class="eyebrow">今日总览</p>',
    `<h1 id="overview-title">关系指数 <span class="index-value">${Math.round(data.index)}</span><span class="index-total">/100</span></h1>`,
    `<p class="muted">${data.personCount} 位人脉 · ${data.eventCount} 条往来记录</p>`,
    '</div>',
    '</header>',
    `<div class="metric-grid">${metrics}</div>`,
    '<div class="overview-mid">',
    chartBlock({ svg: data.radarSvg, label: data.radarLabel }, 'radar'),
    '<div class="health-panel card">',
    '<h2>健康度</h2>',
    chartBlock({ svg: data.gaugeSvg, label: data.gaugeLabel }, 'gauge'),
    '<h2>提醒</h2>',
    alerts,
    '</div>',
    '</div>',
    '<div class="overview-bottom">',
    '<section class="card actions-card" aria-labelledby="actions-title">',
    '<h2 id="actions-title">今日行动清单</h2>',
    `<ul class="action-list">${actions}</ul>`,
    '</section>',
    '<section class="card top-card" aria-labelledby="top-title">',
    '<h2 id="top-title">最近最值得联系的人</h2>',
    top,
    '</section>',
    '</div>',
    '</section>'
  ].join('\n');
}
