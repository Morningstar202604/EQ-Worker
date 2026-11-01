import {
  IDENTITIES,
  EVENT_TYPES,
  createLocalAdapter,
  createStore,
  uid,
  type AppState,
  type EventType,
  type Person,
  type StorageAdapter,
  type Store
} from '../../packages/core/src/index';
import {
  defaultAISettings,
  type AISettings,
  type ContextPolicy,
  type FetchLike,
  type RedactedPreview
} from '../../packages/ai/src/index';
import {
  runAssistant,
  previewAssistantContext,
  type AssistantDisplay,
  type AssistantForm,
  type AssistantRunResult
} from './assistant';
import { demoPayload } from './demo';

export type StudioView = 'overview' | 'persons' | 'ledger' | 'ai';

export type AIStatus = 'idle' | 'preview' | 'ok' | 'offline' | 'disabled' | 'running';

export interface AIMessageView {
  role: 'user' | 'assistant';
  text: string;
  offline?: boolean;
}

export interface StudioStoreOptions {
  adapter?: StorageAdapter;
  now?: () => number;
  fetchImpl?: FetchLike;
  sessionKeyStore?: {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
  } | null;
}

export interface ImportOutcome {
  ok: boolean;
  warnings: string[];
}

const SESSION_KEY = 'eqworker.studio.ai.key';

function browserSessionStorage(): StudioStoreOptions['sessionKeyStore'] {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const probe = '__eqworker_studio_probe__';
    sessionStorage.setItem(probe, '1');
    sessionStorage.removeItem(probe);
    return sessionStorage;
  } catch {
    return null;
  }
}

export class StudioStore {
  private readonly store: Store;
  private readonly nowFn: () => number;
  private readonly fetchImpl?: FetchLike;
  private readonly sessionKeys: StudioStoreOptions['sessionKeyStore'];
  private appState: AppState;
  private currentView: StudioView = 'overview';
  private selectedId: string | null = null;
  private query = '';
  private identityFilter = 'all';
  private aiSettings: AISettings = defaultAISettings();
  private aiForm: AssistantForm;
  private aiPreview: RedactedPreview | null = null;
  private aiResult: AssistantDisplay | null = null;
  private aiStatus: AIStatus = 'idle';
  private aiMessage = '';
  private aiScene = '日常';
  private aiNote = '';
  private aiMessages: AIMessageView[] = [];
  private listeners = new Set<() => void>();
  private lastRun: AssistantRunResult | null = null;
  private aiRunToken = 0;

  constructor(options: StudioStoreOptions = {}) {
    const adapter =
      options.adapter ??
      createLocalAdapter({
        keyPrefix: 'eqworker_studio_',
        storage: typeof localStorage === 'undefined' ? null : localStorage
      });
    this.store = createStore(adapter);
    this.nowFn = options.now ?? (() => Date.now());
    this.fetchImpl = options.fetchImpl;
    this.sessionKeys = options.sessionKeyStore === undefined ? browserSessionStorage() : options.sessionKeyStore;
    this.store.load();
    this.appState = this.store.getState();
    this.selectedId = this.appState.persons[0]?.id ?? null;
    this.aiForm = {
      kind: 'openai',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o-mini',
      apiKey: this.readKey(),
      mock: true
    };
  }

  now(): number {
    return this.nowFn();
  }

  getState(): AppState {
    return this.appState;
  }

  getStore(): Store {
    return this.store;
  }

  getView(): StudioView {
    return this.currentView;
  }

  getSelectedId(): string | null {
    return this.selectedId;
  }

  getSelectedPerson(): Person | null {
    if (!this.selectedId) return null;
    return this.appState.persons.find((person) => person.id === this.selectedId) ?? null;
  }

  getQuery(): string {
    return this.query;
  }

  getIdentityFilter(): string {
    return this.identityFilter;
  }

  getIdentities(): string[] {
    const used = new Set(this.appState.persons.map((person) => person.identity).filter((value) => !!value));
    return IDENTITIES.filter((identity) => used.has(identity));
  }

  getAISettings(): AISettings {
    return this.aiSettings;
  }

  getAIForm(): AssistantForm {
    return this.aiForm;
  }

  getAIPreview(): RedactedPreview | null {
    return this.aiPreview;
  }

  getAIResult(): AssistantDisplay | null {
    return this.aiResult;
  }

  getAIStatus(): AIStatus {
    return this.aiStatus;
  }

  getAIMessage(): string {
    return this.aiMessage;
  }

  getAIScene(): string {
    return this.aiScene;
  }

  getAINote(): string {
    return this.aiNote;
  }

  getAIMessages(): AIMessageView[] {
    return this.aiMessages;
  }

  getLastRun(): AssistantRunResult | null {
    return this.lastRun;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }

  private invalidateAIContext(message: string): void {
    this.aiRunToken += 1;
    this.aiPreview = null;
    this.aiResult = null;
    this.lastRun = null;
    this.aiMessages = [];
    if (this.aiStatus !== 'disabled') {
      this.aiStatus = 'idle';
      this.aiMessage = message;
    }
  }

  setView(view: StudioView): void {
    this.currentView = view;
    this.notify();
  }

  selectPerson(id: string): void {
    if (!this.appState.persons.some((person) => person.id === id)) return;
    if (this.selectedId === id) return;
    this.selectedId = id;
    this.invalidateAIContext('已切换人脉，请重新生成预览');
    this.notify();
  }

  setQuery(query: string): void {
    this.query = query;
    this.notify();
  }

  setIdentityFilter(identity: string): void {
    this.identityFilter = identity;
    this.notify();
  }

  loadDemo(): void {
    this.store.importObjects(demoPayload(this.now()));
    this.appState = this.store.getState();
    this.selectedId = this.appState.persons[0]?.id ?? null;
    this.invalidateAIContext('数据已更新，请重新生成预览');
    this.currentView = 'overview';
    this.notify();
  }

  importJSON(raw: string): ImportOutcome {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { ok: false, warnings: ['JSON 解析失败，请检查文件格式'] };
    }
    const outcome = this.store.importObjects(parsed);
    this.appState = this.store.getState();
    this.selectedId = this.appState.persons[0]?.id ?? null;
    this.invalidateAIContext('数据已导入，请重新生成预览');
    this.notify();
    return { ok: outcome.applied, warnings: outcome.warnings };
  }

  addEvent(input: {
    personId: string;
    type: EventType;
    title: string;
    amount: number;
    dir: 'in' | 'out' | 'none';
    occasion: string;
  }): boolean {
    if (!this.appState.persons.some((person) => person.id === input.personId)) return false;
    const meta = EVENT_TYPES[input.type] ?? EVENT_TYPES.other;
    const event = {
      id: uid(),
      personId: input.personId,
      type: input.type,
      title: input.title.trim().slice(0, 80),
      time: this.now(),
      weight: meta.dHeat,
      note: '',
      amount: Math.max(0, Number(input.amount) || 0),
      dir: input.dir,
      occasion: input.occasion
    };
    this.appState.events = [event, ...this.appState.events];
    this.appState.lastEventId = event.id;
    this.store.save();
    this.invalidateAIContext('往来已记录，请重新生成预览');
    this.notify();
    return true;
  }

  completeReminder(reminderId: string): boolean {
    const reminder = this.appState.reminders.find((item) => item.id === reminderId);
    if (!reminder) return false;
    reminder.status = 'done';
    this.store.save();
    this.notify();
    return true;
  }

  enableAI(): void {
    this.aiSettings = { ...this.aiSettings, enabled: true };
    this.invalidateAIContext('已开启，可先生成预览');
    this.aiStatus = 'idle';
    this.aiMessage = '已开启，可先生成预览';
    this.notify();
  }

  disableAI(): void {
    this.aiSettings = { ...this.aiSettings, enabled: false };
    this.invalidateAIContext('AI 已关闭');
    this.aiStatus = 'disabled';
    this.aiMessage = 'AI 已关闭';
    this.notify();
  }

  updateAIForm(patch: Partial<AssistantForm>): void {
    this.aiForm = { ...this.aiForm, ...patch };
    if (patch.apiKey !== undefined) this.writeKey(patch.apiKey);
    this.invalidateAIContext('配置已更新，请重新生成预览');
    this.notify();
  }

  setAIScene(scene: string): void {
    this.aiScene = scene;
    this.invalidateAIContext('场景已更新，请重新生成预览');
    this.notify();
  }

  setAINote(note: string): void {
    this.aiNote = note;
    this.invalidateAIContext('补充说明已更新，请重新生成预览');
    this.notify();
  }

  togglePolicy(key: keyof ContextPolicy, checked: boolean): void {
    this.aiSettings = {
      ...this.aiSettings,
      contextPolicy: { ...this.aiSettings.contextPolicy, [key]: checked }
    };
    this.invalidateAIContext('隐私字段设置已更新，请重新生成预览');
    this.notify();
  }

  setAIPerson(id: string): void {
    this.selectPerson(id);
  }

  private readKey(): string {
    if (!this.sessionKeys) return '';
    try {
      return this.sessionKeys.getItem(SESSION_KEY) ?? '';
    } catch {
      return '';
    }
  }

  private writeKey(key: string): void {
    if (!this.sessionKeys) return;
    try {
      if (key) this.sessionKeys.setItem(SESSION_KEY, key);
      else this.sessionKeys.removeItem(SESSION_KEY);
    } catch {
      return;
    }
  }

  private inputContext(): { scene: string; note: string } {
    return { scene: this.aiScene, note: this.aiNote };
  }

  previewAI(): void {
    const person = this.getSelectedPerson();
    if (!person) {
      this.aiMessage = '请先选择一位人脉';
      this.aiStatus = 'idle';
      this.notify();
      return;
    }
    this.aiPreview = previewAssistantContext(
      this.appState,
      person,
      this.aiSettings,
      this.inputContext(),
      this.now()
    );
    this.aiStatus = 'preview';
    this.aiMessage = '预览已生成，确认后才会发送';
    this.notify();
  }

  async runAI(): Promise<AssistantRunResult> {
    const person = this.getSelectedPerson();
    if (!person) {
      const outcome: AssistantRunResult = {
        status: 'disabled',
        preview: null,
        pipeline: null,
        display: null,
        offline: false,
        message: '请先选择一位人脉'
      };
      this.lastRun = outcome;
      this.aiMessage = outcome.message;
      this.notify();
      return outcome;
    }

    const runToken = this.aiRunToken;
    const approved = this.aiSettings.enabled && this.aiPreview !== null;
    if (this.aiSettings.enabled && !approved) {
      this.aiStatus = 'running';
      this.aiMessage = '正在生成发送前预览…';
      this.notify();
      const previewResult = await runAssistant({
        app: this.appState,
        settings: this.aiSettings,
        form: this.aiForm,
        personId: person.id,
        scene: this.aiScene,
        note: this.aiNote,
        approved: false,
        now: this.now(),
        ...(this.fetchImpl ? { fetchImpl: this.fetchImpl } : {})
      });
      if (runToken !== this.aiRunToken || this.selectedId !== person.id) return previewResult;
      this.lastRun = previewResult;
      this.aiPreview = previewResult.preview;
      this.aiStatus = previewResult.status === 'disabled' ? 'disabled' : 'preview';
      this.aiMessage = previewResult.message;
      this.notify();
      return previewResult;
    }

    this.aiStatus = 'running';
    this.aiMessage = '运行中…';
    this.notify();

    this.aiMessages = [
      ...this.aiMessages,
      { role: 'user', text: `${person.name} · ${this.aiScene}${this.aiNote ? ` · ${this.aiNote}` : ''}` }
    ];

    const result = await runAssistant({
      app: this.appState,
      settings: this.aiSettings,
      form: this.aiForm,
      personId: person.id,
      scene: this.aiScene,
      note: this.aiNote,
      approved,
      now: this.now(),
      ...(this.fetchImpl ? { fetchImpl: this.fetchImpl } : {})
    });

    if (runToken !== this.aiRunToken || this.selectedId !== person.id) return result;
    this.lastRun = result;
    this.aiPreview = result.preview ?? this.aiPreview;
    this.aiResult = result.display;
    this.aiStatus = result.status;
    this.aiMessage = result.message;

    if (result.display && (result.display.variants.length || result.display.advice)) {
      const text = result.display.variants[0]?.text || result.display.advice;
      this.aiMessages = [
        ...this.aiMessages,
        { role: 'assistant', text, ...(result.offline ? { offline: true } : {}) }
      ];
    } else if (result.status === 'disabled') {
      this.aiMessages = [
        ...this.aiMessages,
        { role: 'assistant', text: 'AI 未启用，本次没有发送任何网络请求。' }
      ];
    }

    this.notify();
    return result;
  }
}
