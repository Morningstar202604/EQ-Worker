import {
  EVENT_TYPES,
  computePerson,
  eventDir,
  fmtDate,
  getSuggestion,
  ledgerNetLabel,
  personHealth,
  personLedger,
  relationRead,
  type AppState,
  type Person
} from '../../../packages/core/src/index';
import { radarSvg } from '../../../packages/viz/src/index';
import type { StudioStore } from '../state';
import {
  renderPersons,
  type LedgerEntryView,
  type PersonDetailView,
  type PersonListItem,
  type PersonsData
} from '../views/persons';

function matchesQuery(person: Person, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return (
    person.name.toLowerCase().includes(needle) ||
    person.identity.toLowerCase().includes(needle) ||
    person.tags.some((tag) => tag.toLowerCase().includes(needle))
  );
}

export function buildPersonList(state: AppState, query: string, identityFilter: string, now: number): PersonListItem[] {
  return state.persons
    .filter((person) => (identityFilter === 'all' ? true : person.identity === identityFilter))
    .filter((person) => matchesQuery(person, query))
    .map((person) => {
      const computed = computePerson(state, person, now);
      const ledger = personLedger(state, person.id);
      return {
        id: person.id,
        name: person.name,
        identity: person.identity,
        tags: person.tags,
        heat: computed.heat,
        net: ledger.net,
        netLabel: ledgerNetLabel(ledger.net),
        status: ledger.status,
        lastDays: computed.lastDays,
        eventCount: computed.eventCount
      };
    })
    .sort((a, b) => b.heat - a.heat || a.name.localeCompare(b.name, 'zh'));
}

export function buildPersonDetail(state: AppState, person: Person, now: number): PersonDetailView {
  const computed = computePerson(state, person, now);
  const ledger = personLedger(state, person.id);
  const health = personHealth(state, person, now);
  const radar = radarSvg(
    [
      { label: '热度', value: computed.heat },
      { label: '信任', value: computed.trust },
      { label: '亲密', value: computed.intimacy },
      { label: '活跃', value: computed.activity },
      { label: '人情债', value: computed.debt }
    ],
    { title: `${person.name} 的关系雷达`, desc: '热度、信任、亲密、活跃与人情债', width: 320, height: 300 }
  );

  const entries: LedgerEntryView[] = state.events
    .filter((event) => event.personId === person.id)
    .sort((a, b) => b.time - a.time)
    .map((event) => ({
      id: event.id,
      title: event.title,
      typeLabel: EVENT_TYPES[event.type]?.label ?? '其他',
      date: fmtDate(event.time),
      amount: event.amount,
      dir: eventDir(event),
      occasion: event.occasion
    }));

  return {
    id: person.id,
    name: person.name,
    identity: person.identity,
    tags: person.tags,
    birthday: person.birthday,
    likes: person.likes,
    taboos: person.taboos,
    note: person.note,
    radarSvg: radar,
    radarLabel: `${person.name} 的关系雷达图`,
    relationReadText: relationRead(state, person, now),
    suggestion: getSuggestion(state, person, now),
    health: { score: health.score, level: health.level, cls: health.cls, tips: health.tips },
    ledger: { given: ledger.given, received: ledger.received, net: ledger.net },
    entries
  };
}

export function renderPersonsView(studio: StudioStore): string {
  const state = studio.getState();
  const now = studio.now();
  const selected = studio.getSelectedPerson();
  const data: PersonsData = {
    items: buildPersonList(state, studio.getQuery(), studio.getIdentityFilter(), now),
    detail: selected ? buildPersonDetail(state, selected, now) : null,
    query: studio.getQuery(),
    identity: studio.getIdentityFilter(),
    identities: studio.getIdentities()
  };
  return renderPersons(data);
}
