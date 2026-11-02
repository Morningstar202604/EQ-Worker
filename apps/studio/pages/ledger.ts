import {
  computePerson,
  fmtMoney,
  healthRanking,
  ledgerInsights,
  ledgerNetLabel,
  ledgerTotals,
  personLedger,
  type AppState
} from '../../../packages/core/src/index';
import { flowSvg, networkSvg, trendSvg, type NetworkLink, type TrendPoint } from '../../../packages/viz/src/index';
import type { StudioStore } from '../state';
import {
  renderLedger,
  type LedgerData,
  type LedgerPersonRow,
  type RelationshipInsightsView,
  type RelationshipInsightRow
} from '../views/ledger';

function lastSixMonths(now: number): Array<{ label: string; start: number; end: number }> {
  const base = new Date(now);
  const months: Array<{ label: string; start: number; end: number }> = [];
  for (let i = 5; i >= 0; i -= 1) {
    const start = new Date(base.getFullYear(), base.getMonth() - i, 1).getTime();
    const end = new Date(base.getFullYear(), base.getMonth() - i + 1, 1).getTime();
    const d = new Date(start);
    months.push({ label: `${d.getMonth() + 1}月`, start, end });
  }
  return months;
}

function buildTrendPoints(state: AppState, now: number): TrendPoint[] {
  return lastSixMonths(now).map((month) => {
    let given = 0;
    let received = 0;
    for (const event of state.events) {
      if (event.time < month.start || event.time >= month.end) continue;
      const amount = Number(event.amount) || 0;
      if (amount <= 0) continue;
      const dir =
        event.dir === 'in' || event.dir === 'out'
          ? event.dir
          : event.type === 'gift_get'
            ? 'in'
            : event.type === 'gift_give'
              ? 'out'
              : 'none';
      if (dir === 'out') given += amount;
      else if (dir === 'in') received += amount;
    }
    return { label: month.label, given, received };
  });
}

function buildNetwork(state: AppState): { nodes: Array<{ id: string; label: string; weight: number }>; links: NetworkLink[] } {
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

function buildRelationshipInsights(state: AppState, now: number): RelationshipInsightsView {
  const network = buildNetwork(state);
  const ranking = healthRanking(state, now).map<RelationshipInsightRow>((item) => {
    const ledger = personLedger(state, item.p.id);
    const computed = computePerson(state, item.p, now);
    return {
      id: item.p.id,
      name: item.p.name,
      score: item.h.score,
      level: item.h.level,
      cls: item.h.cls,
      netLabel: ledgerNetLabel(ledger.net),
      lastDays: computed.lastDays
    };
  });

  const nodes = network.nodes.map((node) => ({ id: node.id, label: node.label, weight: node.weight }));
  return {
    networkSvg: networkSvg(nodes, network.links, {
      title: '关系网络',
      desc: `${nodes.length} 个节点，边宽代表往来金额`,
      width: 520,
      height: 420
    }),
    networkLabel: '关系网络图，节点为人，边为往来金额',
    trendSvg: trendSvg(buildTrendPoints(state, now), {
      title: '近 6 月收发趋势',
      desc: '按月份统计收礼与送礼金额',
      width: 520,
      height: 300
    }),
    trendLabel: '近 6 个月收发趋势图',
    ranking,
    nodeCount: nodes.length,
    linkCount: network.links.length
  };
}

export function buildLedgerData(state: AppState, now: number): LedgerData {
  const totals = ledgerTotals(state);
  const insights = ledgerInsights(state, now);

  const rows: LedgerPersonRow[] = state.persons
    .map((person) => {
      const ledger = personLedger(state, person.id);
      return {
        id: person.id,
        name: person.name,
        given: ledger.given,
        received: ledger.received,
        net: ledger.net,
        netLabel: ledgerNetLabel(ledger.net),
        status: ledger.status
      };
    })
    .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));

  const flowRows: Array<{ label: string; value: number; dir: 'in' | 'out' }> = [];
  for (const person of state.persons) {
    const ledger = personLedger(state, person.id);
    if (ledger.given > 0) flowRows.push({ label: `${person.name}·给出`, value: ledger.given, dir: 'out' });
    if (ledger.received > 0) flowRows.push({ label: `${person.name}·收到`, value: ledger.received, dir: 'in' });
  }

  const flow = flowSvg(flowRows, {
    title: '收支流向',
    desc: `累计给出 ${fmtMoney(totals.given)}，累计收到 ${fmtMoney(totals.received)}`,
    width: 460
  });

  return {
    totals: {
      given: totals.given,
      received: totals.received,
      net: totals.net,
      owe: totals.owe,
      due: totals.due,
      oweCount: totals.oweCount,
      dueCount: totals.dueCount
    },
    flowSvg: flow,
    flowLabel: '人情收支流向图',
    insights: {
      monthGiven: insights.monthGiven,
      monthReceived: insights.monthReceived,
      monthCount: insights.monthCount,
      avgGiven: insights.avgGiven,
      maxGift: insights.maxGift,
      topOccasion: insights.topOccasion,
      topOccasionAmount: insights.topOccasionAmount
    },
    relationship: buildRelationshipInsights(state, now),
    rows
  };
}

export function renderLedgerView(studio: StudioStore): string {
  return renderLedger(buildLedgerData(studio.getState(), studio.now()));
}
