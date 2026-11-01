export type EventType =
  | 'help_them'
  | 'help_me'
  | 'meal'
  | 'gift_get'
  | 'gift_give'
  | 'money'
  | 'talk'
  | 'greeting'
  | 'conflict'
  | 'other';

export type GiftTier = 'simple' | 'standard' | 'generous';
export type CityTier = '三线' | '二线' | '一线';
export type Occasion = '日常' | '生日' | '婚礼' | '满月' | '乔迁' | '探病' | '节日' | '还礼' | '其他';
export type Dir = 'in' | 'out' | 'none';
export type LedgerStatus = 'owe' | 'due' | 'clear';
export type Diff = '入门' | '进阶' | '高手';
export type ScriptToneId = 'stable' | 'close' | 'brief';

export interface Person {
  id: string;
  name: string;
  identity: string;
  tags: string[];
  birthday: string;
  anniversary: string;
  likes: string;
  taboos: string;
  note: string;
  adjust: number;
  createdAt: number;
}

export interface PersonalEvent {
  id: string;
  personId: string;
  type: EventType;
  title: string;
  time: number;
  weight: number;
  note: string;
  amount: number;
  dir: Dir;
  occasion: string;
}

export interface Reminder {
  id: string;
  personId: string;
  content: string;
  date: string;
  status: 'pending' | 'done';
}

export interface ProgressEntry {
  best: number;
  times: number;
}

export interface Streak {
  n: number;
  last: string;
}

export interface AISettings {
  enabled: boolean;
  providerId: string;
  model: string;
  baseUrl: string;
  temperature: number;
}

export interface Settings {
  giftTier: GiftTier;
  cityTier: CityTier;
  ai: AISettings;
}

export interface Meta {
  schema: number;
  updatedAt: number;
}

export interface AppState {
  persons: Person[];
  events: PersonalEvent[];
  reminders: Reminder[];
  progress: Record<string, ProgressEntry>;
  streak: Streak;
  settings: Settings;
  meta: Meta;
  lastEventId?: string | null;
  filter?: string;
  identity?: string;
  sortBy?: string;
  trainDiff?: string;
  ledgerFilter?: string;
}

export interface ComputedPerson {
  heat: number;
  trust: number;
  intimacy: number;
  activity: number;
  debt: number;
  lastDays: number | null;
  eventCount: number;
}

export interface Ledger {
  given: number;
  received: number;
  net: number;
  givenCount: number;
  receivedCount: number;
  lastAmount: number;
  lastDir: Dir;
  status: LedgerStatus;
}

export interface LedgerTotals {
  given: number;
  received: number;
  net: number;
  owe: number;
  due: number;
  oweCount: number;
  dueCount: number;
}

export interface LedgerInsights {
  ym: string;
  monthGiven: number;
  monthReceived: number;
  monthCount: number;
  avgGiven: number;
  givenCount: number;
  maxGift: number;
  topOccasion: string;
  topOccasionAmount: number;
}

export interface SettlePrefill {
  personId: string;
  type: EventType;
  dir: Dir;
  amount: number;
  occasion: string;
  title: string;
  net: number;
  owe: boolean;
}

export interface GiftAdvice {
  low: number;
  mid: number;
  high: number;
  identity: string;
  occasion: string;
  tier: string;
  city: string;
  ledger: Ledger;
  reasons: string[];
  note: string;
}

export interface HealthResult {
  score: number;
  level: string;
  cls: string;
  tips: string[];
  reciprocity: number;
  conflicts: number;
}

export interface HealthRankingItem {
  p: Person;
  h: HealthResult;
  l: Ledger;
}

export interface ActionButton {
  label: string;
  act: string;
  arg?: string;
}

export interface ActionItem {
  key: string;
  personId: string;
  tone: string;
  icon: string;
  prio: number;
  title: string;
  reason: string;
  primary: ActionButton;
  secondary: ActionButton | null;
}

export interface AlertItem {
  ic: string;
  cls: string;
  personId: string;
  text: string;
  reminderId?: string;
}

export interface LevelDef {
  min: number;
  name: string;
  desc: string;
}

export interface LevelResult {
  cur: LevelDef;
  nxt: LevelDef | undefined;
  pct: number;
}

export interface ScenarioChoice {
  t: string;
  s: number;
  r: string;
}

export interface Scenario {
  id: string;
  diff: Diff;
  tag: string;
  title: string;
  scene: string;
  choices: ScenarioChoice[];
  tip: string;
}

export interface ScriptTone {
  id: ScriptToneId;
  label: string;
}

export interface ScriptContext {
  name: string;
  identity: string;
  likes: string;
  taboos: string;
  eventTitle: string;
  eventType: string;
  context: string;
}

export interface ScriptScene {
  id: string;
  label: string;
  hint: string;
  build: (c: ScriptContext) => Record<ScriptToneId, string>;
}

export interface ScriptVariant {
  tone: string;
  id: ScriptToneId;
  text: string;
}

export interface ScriptResult {
  scene: ScriptScene;
  person: Person | null;
  variants: ScriptVariant[];
}

export interface UpcomingDate {
  kind: string;
  name: string;
  days: number;
  personId: string;
  date: string;
  extra?: string;
}

export interface SanitizeResult {
  persons: Person[];
  events: PersonalEvent[];
  reminders: Reminder[];
  progress: Record<string, ProgressEntry>;
  streak: Streak;
  settings: Settings;
  warn: string[];
  schemaMismatch: boolean;
}
