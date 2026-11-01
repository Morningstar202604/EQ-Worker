import { escapeHtml, lastSeen, money } from './html';
import { ledgerNetLabel } from '../../../packages/core/src/index';

export interface PersonListItem {
  id: string;
  name: string;
  identity: string;
  tags: string[];
  heat: number;
  net: number;
  netLabel: string;
  status: 'owe' | 'due' | 'clear';
  lastDays: number | null;
  eventCount: number;
}

export interface LedgerEntryView {
  id: string;
  title: string;
  typeLabel: string;
  date: string;
  amount: number;
  dir: 'in' | 'out' | 'none';
  occasion: string;
}

export interface PersonDetailView {
  id: string;
  name: string;
  identity: string;
  tags: string[];
  birthday: string;
  likes: string;
  taboos: string;
  note: string;
  radarSvg: string;
  radarLabel: string;
  relationReadText: string;
  suggestion: string;
  health: { score: number; level: string; cls: string; tips: string[] };
  ledger: { given: number; received: number; net: number };
  entries: LedgerEntryView[];
}

export interface PersonsData {
  items: PersonListItem[];
  detail: PersonDetailView | null;
  query: string;
  identity: string;
  identities: string[];
}

const DIR_LABEL: Record<'in' | 'out' | 'none', string> = { in: '收', out: '支', none: '无' };

export function renderPersons(data: PersonsData): string {
  const rows = data.items.length
    ? data.items
        .map(
          (item) => [
            `<tr class="person-row${data.detail && data.detail.id === item.id ? ' selected' : ''}">`,
            `<td>`,
            `<button type="button" class="linklike person-open" data-act="person-open" data-id="${escapeHtml(item.id)}" aria-label="查看 ${escapeHtml(item.name)} 的详情">`,
            `<span class="person-name">${escapeHtml(item.name)}</span>`,
            `<span class="person-sub">${escapeHtml(item.identity || '未标注')}${item.tags.length ? ' · ' + item.tags.map(escapeHtml).join(' / ') : ''}</span>`,
            `</button>`,
            `</td>`,
            `<td><span class="heat" title="热度 ${Math.round(item.heat)}">${Math.round(item.heat)}</span></td>`,
            `<td class="status-${item.status}">${escapeHtml(item.netLabel)}</td>`,
            `<td class="muted">${escapeHtml(lastSeen(item.lastDays))}</td>`,
            `</tr>`
          ].join('')
        )
        .join('\n')
    : '<tr><td colspan="4" class="muted center">没有符合条件的人脉</td></tr>';

  const identityOptions = ['all', ...data.identities]
    .map(
      (identity) =>
        `<option value="${escapeHtml(identity)}"${identity === data.identity ? ' selected' : ''}>${escapeHtml(identity === 'all' ? '全部身份' : identity)}</option>`
    )
    .join('');

  return [
    '<section class="view persons" aria-labelledby="persons-title">',
    '<header class="view-head">',
    '<div>',
    '<p class="eyebrow">人脉</p>',
    '<h1 id="persons-title">人脉与关系详情</h1>',
    `<p class="muted">共 ${data.items.length} 人</p>`,
    '</div>',
    '<div class="filters">',
    `<label class="field inline"><span>搜索</span><input type="search" value="${escapeHtml(data.query)}" placeholder="姓名或标签" data-act="person-search" aria-label="搜索人脉"></label>`,
    `<label class="field inline"><span>身份</span><select data-act="person-identity" aria-label="按身份筛选">${identityOptions}</select></label>`,
    '</div>',
    '</header>',
    '<div class="persons-layout">',
    '<div class="card table-card">',
    '<table class="data-table">',
    '<thead><tr><th scope="col">姓名 / 身份</th><th scope="col">热度</th><th scope="col">账本净额</th><th scope="col">最后往来</th></tr></thead>',
    `<tbody>${rows}</tbody>`,
    '</table>',
    '</div>',
    data.detail ? renderPersonDetail(data.detail) : '<aside class="card detail-placeholder"><p>选择左侧任意一位，查看关系雷达、建议与账本明细。</p></aside>',
    '</div>',
    '</section>'
  ].join('\n');
}

function renderPersonDetail(detail: PersonDetailView): string {
  const entries = detail.entries.length
    ? detail.entries
        .map(
          (entry) => [
            '<tr>',
            `<td>${escapeHtml(entry.date)}</td>`,
            `<td><span class="tag">${escapeHtml(entry.typeLabel)}</span> ${escapeHtml(entry.title || entry.occasion || '往来')}</td>`,
            `<td class="dir-${entry.dir}">${entry.dir === 'none' ? '—' : `${DIR_LABEL[entry.dir]} ${escapeHtml(money(entry.amount))}`}</td>`,
            '</tr>'
          ].join('')
        )
        .join('\n')
    : '<tr><td colspan="3" class="muted">还没有账本记录</td></tr>';

  const tags = detail.tags.length
    ? detail.tags.map((tag) => `<span class="chip">${escapeHtml(tag)}</span>`).join('')
    : '<span class="muted">无标签</span>';

  const tips = detail.health.tips.length
    ? `<ul class="tips">${detail.health.tips.map((tip) => `<li>${escapeHtml(tip)}</li>`).join('')}</ul>`
    : '<p class="muted">暂无建议</p>';

  return [
    `<aside class="card person-detail" aria-labelledby="detail-title">`,
    '<div class="detail-head">',
    '<div>',
    `<h2 id="detail-title">${escapeHtml(detail.name)}</h2>`,
    `<p class="muted">${escapeHtml(detail.identity || '未标注身份')} · ${detail.birthday ? `生日 ${escapeHtml(detail.birthday)}` : '未记录生日'}</p>`,
    `<div class="chips">${tags}</div>`,
    '</div>',
    `<span class="health-badge ${escapeHtml(detail.health.cls)}">${escapeHtml(detail.health.level)} · ${detail.health.score}</span>`,
    '</div>',
    `<figure class="chart person-radar" role="img" aria-label="${escapeHtml(detail.radarLabel)}">${detail.radarSvg}</figure>`,
    `<p class="relation-read">${escapeHtml(detail.relationReadText)}</p>`,
    '<section class="detail-section">',
    '<h3>关系建议</h3>',
    `<p>${escapeHtml(detail.suggestion)}</p>`,
    '</section>',
    '<section class="detail-section">',
    '<h3>健康提示</h3>',
    tips,
    '</section>',
    '<section class="detail-section">',
    '<h3>账本明细</h3>',
    `<div class="ledger-summary">`,
    `<span>累计给出 <strong>${escapeHtml(money(detail.ledger.given))}</strong></span>`,
    `<span>累计收到 <strong>${escapeHtml(money(detail.ledger.received))}</strong></span>`,
    `<span>净额 <strong>${escapeHtml(ledgerNetLabel(detail.ledger.net))}</strong></span>`,
    `</div>`,
    '<table class="data-table compact">',
    '<thead><tr><th scope="col">日期</th><th scope="col">事项</th><th scope="col">金额</th></tr></thead>',
    `<tbody>${entries}</tbody>`,
    '</table>',
    '</section>',
    '</aside>'
  ].join('\n');
}
