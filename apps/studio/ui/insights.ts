import {
  computePerson,
  healthRanking,
  ledgerNetLabel,
  personLedger,
  type AppState
} from '../../../packages/core/src/index';
import { networkSvg, trendSvg, type NetworkLink, type TrendPoint } from '../../../packages/viz/src/index';
import type { StudioStore } from '../state';
import { renderInsights, type InsightRow, type InsightsData } from '../views/insights';

function lastSixMonths(now: number): Array<{ key: string; label: string; start: number; end: number }> {
  const base = new Date(now);
  const months: Array<{ key: string; label: string; start: number; end: number }> = [];
  for (let i = 5; i >= 0; i -= 1) {
    const start = new Date(base.getFullYear(), base.getMonth() - i, 1).getTime();
    const end = new Date(base.getFullYear(), base.getMonth() - i + 1, 1).getTime();
    const d = new Date(start);
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: `${d.getMonth() + 1}月`,
      start,
      end
    });
  }
  return months;
}

export function buildTrendPoints(state: AppState, now: number): TrendPoint[] {
  return lastSixMonths(now).map((month) => {
    let given = 0;
    let received = 0;
    for (const event of state.events) {
      if (event.time < month.start || event.time >= month.end) continue;
      const amount = Number(event.amount) || 0;
      if (amount <= 0) continue;
      const dir = event.dir === 'in' || event.dir === 'out' ? event.dir : event.type === 'gift_get' ? 'in' : event.type === 'gift_give' ? 'out' : 'none';
      if (dir === 'out') given += amount;
      else if (dir === 'in') received += amount;
    }
    return { label: month.label, given, received };
  });
}

export function buildNetwork(state: AppState, now: number): { nodes: Array<{ id: string; label: string; weight: number }>; links: NetworkLink[] } {
  const nodes = state.persons.map((person) => ({
    id: person.id,
    label: person.name,
    weight: state.events.filter((event) => event.personId === person.id).length
  }));

  const byPerson = new Map<string, NetworkLink>();
  for (const event of state.events) {
    const amount = Number(event.amount) || 0;
    if (amount <= 0 || !event.personId) continue;
    const existing = byPerson.get(event.personId);
    if (existing) {
      existing.weight = (existing.weight ?? 0) + amount;
    } else {
      byPerson.set(event.personId, { source: 'self', target: event.personId, weight: amount });
    }
  }

  return {
    nodes: [{ id: 'self', label: '我', weight: Math.max(1, state.events.length) }, ...nodes],
    links: Array.from(byPerson.values())
  };
}

export function buildInsightsData(state: AppState, now: number): InsightsData {
  const network = buildNetwork(state, now);
  const ranking = healthRanking(state, now).map<InsightRow>((item) => {
    const ledger = personLedger(state, item.p.id);
    const computed = computePerson(state, item.p, now);
    return {
      id: item.p.id,
      name: item.p.name,
      score: item.h.score,
      level: item.h.level,
      cls: item.h.cls,
      net: ledger.net,
      netLabel: ledgerNetLabel(ledger.net),
      lastDays: computed.lastDays
    };
  });

  const nodes = network.nodes.map((node) => ({ id: node.id, label: node.label, weight: node.weight }));
  const net = networkSvg(nodes, network.links, {
    title: '关系网络',
    desc: `${nodes.length} 个节点，边宽代表往来金额`,
    width: 520,
    height: 420
  });

  const trend = trendSvg(buildTrendPoints(state, now), {
    title: '近 6 月收发趋势',
    desc: '按月份统计收礼与送礼金额',
    width: 520,
    height: 300
  });

  return {
    networkSvg: net,
    networkLabel: '关系网络图，节点为人，边为往来金额',
    trendSvg: trend,
    trendLabel: '近 6 个月收发趋势图',
    ranking,
    nodeCount: nodes.length,
    linkCount: network.links.length
  };
}

export function renderInsightsView(studio: StudioStore): string {
  return renderInsights(buildInsightsData(studio.getState(), studio.now()));
}
