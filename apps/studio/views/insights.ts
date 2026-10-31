import { escapeHtml } from './html';

export interface InsightRow {
  id: string;
  name: string;
  score: number;
  level: string;
  cls: string;
  net: number;
  netLabel: string;
  lastDays: number | null;
}

export interface InsightsData {
  networkSvg: string;
  networkLabel: string;
  trendSvg: string;
  trendLabel: string;
  ranking: InsightRow[];
  nodeCount: number;
  linkCount: number;
}

export function renderInsights(data: InsightsData): string {
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
    '<section class="view insights" aria-labelledby="insights-title">',
    '<header class="view-head">',
    '<div>',
    '<p class="eyebrow">洞察</p>',
    '<h1 id="insights-title">关系网络与往来趋势</h1>',
    `<p class="muted">${data.nodeCount} 个节点 · ${data.linkCount} 条边（按往来金额加权）</p>`,
    '</div>',
    '</header>',
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
    '</section>'
  ].join('\n');
}
