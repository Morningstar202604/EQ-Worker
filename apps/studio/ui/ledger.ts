import {
  fmtMoney,
  ledgerInsights,
  ledgerNetLabel,
  ledgerTotals,
  personLedger,
  type AppState
} from '../../../packages/core/src/index';
import { flowSvg } from '../../../packages/viz/src/index';
import type { StudioStore } from '../state';
import { renderLedger, type LedgerData, type LedgerPersonRow } from '../views/ledger';

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
    rows
  };
}

export function renderLedgerView(studio: StudioStore): string {
  return renderLedger(buildLedgerData(studio.getState(), studio.now()));
}
