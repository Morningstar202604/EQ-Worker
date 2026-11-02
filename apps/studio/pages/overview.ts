import {
  buildActions,
  buildAlerts,
  computePerson,
  healthRanking,
  overallMetrics,
  type AppState
} from '../../../packages/core/src/index';
import { gaugeSvg, radarSvg } from '../../../packages/viz/src/index';
import type { StudioStore } from '../state';
import { renderOverview, type OverviewAction, type OverviewData } from '../views/overview';

function stripTags(text: string): string {
  return text.replace(/<\/?b>/g, '');
}

export function buildOverviewData(state: AppState, now: number): OverviewData | null {
  const metrics = overallMetrics(state, now);
  if (!metrics) return null;

  const actions: OverviewAction[] = buildActions(state, 6, now).map((action) => ({
    key: action.key,
    title: action.title,
    reason: action.reason,
    tone: action.tone,
    personId: action.personId,
    primaryLabel: action.primary.label,
    secondaryLabel: action.secondary ? action.secondary.label : '',
    primaryAct: action.primary.act,
    primaryArg: action.primary.arg ?? '',
    secondaryAct: action.secondary ? action.secondary.act : '',
    secondaryArg: action.secondary?.arg ?? ''
  }));

  const ranking = healthRanking(state, now);
  const healthAvg = ranking.length
    ? Math.round(ranking.reduce((sum, item) => sum + item.h.score, 0) / ranking.length)
    : 0;

  const radar = radarSvg(
    [
      { label: '规模', value: metrics.scale },
      { label: '热度', value: metrics.heatAvg },
      { label: '频率', value: metrics.freq },
      { label: '信用', value: metrics.credit },
      { label: '智慧', value: metrics.wisdom }
    ],
    { title: '五维关系指标', desc: '规模、热度、频率、信用与智慧构成的关系盘面', width: 360, height: 340 }
  );

  const gauge = gaugeSvg(healthAvg, { title: '关系健康度', label: '平均健康度', width: 260, height: 190 });

  const topRanked = ranking.length
    ? [...ranking].sort((a, b) => b.h.score - a.h.score)[0]
    : null;
  const topComputed = topRanked ? computePerson(state, topRanked.p, now) : null;

  return {
    index: metrics.index,
    scale: metrics.scale,
    heatAvg: metrics.heatAvg,
    freq: metrics.freq,
    credit: metrics.credit,
    wisdom: metrics.wisdom,
    radarSvg: radar,
    radarLabel: '五维关系指标雷达图',
    gaugeSvg: gauge,
    gaugeLabel: '关系健康度仪表盘',
    actions,
    alerts: buildAlerts(state, now).map((alert) => stripTags(alert.text)),
    personCount: state.persons.length,
    eventCount: state.events.length,
    topPerson: topRanked && topComputed
      ? {
          id: topRanked.p.id,
          name: topRanked.p.name,
          heat: topComputed.heat,
          lastDays: topComputed.lastDays
        }
      : null
  };
}

export function renderOverviewView(studio: StudioStore): string {
  const data = buildOverviewData(studio.getState(), studio.now());
  if (!data) return '';
  return renderOverview(data);
}
