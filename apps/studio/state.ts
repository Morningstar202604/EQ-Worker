import {
  IDENTITIES,
  EVENT_TYPES,
  createLocalAdapter,
  createStore,
  recordPractice,
  commitPractice,
  uid,
  type AppState,
  type EventType,
  type Person,
  type PracticeResult,
  type Diff,
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

export type StudioView = 'overview' | 'persons' | 'ledger' | 'practice' | 'ai';

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
  try {
    if (typeof sessionStorage === 'undefined') return null;
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
  private aiAbort: AbortController | null = null;
  private storageWarning = '';
  private practiceFilter: Diff | '全部' = '全部';

  constructor(options: StudioStoreOptions = {}) {
    const backing = options.adapter ?? createLocalAdapter({ keyPrefix: 'eqworker_studio_' });
    let hadStoredValue = false;
    let writeProtected = false;
    const warnRead = (): void => {
      writeProtected = true;
      this.storageWarning = '本地存储读取失败或不可用，已启用写保护，当前更改仅保存在内存中。导出的当前数据可能不含历史数据；请另存备份，修复浏览器存储或在浏览器存储中恢复原始备份后重新加载。';
    };
    const warnSave = (): void => { this.storageWarning = '本地保存失败，当前更改可能仅保存在内存中；请及时导出备份。'; };
    const adapter: StorageAdapter = {
      getItem: (key) => {
        try {
          const value = backing.getItem(key);
          if (value) hadStoredValue = true;
          if ('degraded' in backing && backing.degraded) warnRead();
          return value;
        } catch {
          warnRead();
          return null;
        }
      },
      setItem: (key, value) => {
        if (writeProtected) return false;
        try {
          const saved = backing.setItem(key, value);
          if (!saved) warnSave();
          return saved;
        } catch {
          warnSave();
          return false;
        }
      },
      removeItem: (key) => backing.removeItem(key)
    };
    this.store = createStore(adapter);
    this.nowFn = options.now ?? (() => Date.now());
    this.fetchImpl = options.fetchImpl;
    this.sessionKeys = options.sessionKeyStore === undefined ? browserSessionStorage() : options.sessionKeyStore;
    this.store.load();
    /* store 内部进入写保护（备份写不进去、或清洗会真丢数据）时，
       不会经过 adapter 的 warn 回调。这里补一次判定，让用户知道原因；
       文案用「写保护」而不是「保存失败」，因为数据仍在、只是改不动。 */
    /* hadStoredValue 用于区分「首次使用」和「有数据但读不出来」：
       后者才是需要告警的情况。 */
    if ((this.store.isWriteProtected() || hadStoredValue && this.store.getState().persons.length === 0) && !this.storageWarning) warnRead();
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

  getStorageWarning(): string {
    return this.storageWarning;
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
    this.aiAbort?.abort();
    this.aiAbort = null;
    this.aiPreview = null;
    this.aiResult = null;
    this.lastRun = null;
    this.aiMessages = [];
    if (this.aiStatus !== 'disabled') {
      this.aiStatus = 'idle';
      this.aiMessage = message;
    }
  }

  getPracticeFilter(): Diff | '全部' {
    return this.practiceFilter;
  }

  setPracticeFilter(filter: Diff | '全部'): void {
    this.practiceFilter = filter;
    this.notify();
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
      /* 借款方向必须由用户明确选择：缺省 none，绝不猜成 in。
         猜成 in 会把「我借给对方 5000」记成「我欠对方 5000」。 */
      dir: input.dir,
      occasion: input.occasion
    };
    const prevEvents = this.appState.events;
    const prevLast = this.appState.lastEventId;
    this.appState.events = [event, ...this.appState.events];
    this.appState.lastEventId = event.id;
    /* 落盘失败必须回滚并返回 false：以前忽略返回值，
       界面显示「已记录」，刷新后这条往来就没了。 */
    if (!this.store.save()) {
      this.appState.events = prevEvents;
      this.appState.lastEventId = prevLast;
      this.invalidateAIContext('保存失败，本次记录未写入');
      this.notify();
      return false;
    }
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

  /**
   * 提交一次情景练习。计分与连击规则来自 core 的 recordPractice，
   * 这里只负责落库与通知；保存失败时回滚，避免 UI 显示成功但实际没存。
   */
  answerScenario(scenarioId: string, choiceIndex: number): PracticeResult | null {
    const result = recordPractice(this.appState, scenarioId, choiceIndex, this.now());
    if (!result) return null;
    const before = this.appState;
    const next = commitPractice(before, result, scenarioId);
    this.appState = next;
    // 关键：commitPractice 返回新对象，必须同步回 store，否则 save() 仍序列化旧状态。
    this.store.setState(next);
    const ok = this.store.save();
    if (!ok) {
      this.appState = before;
      this.store.setState(before);
      this.storageWarning = '练习结果保存失败，本次成绩未记录。请检查浏览器存储空间。';
      this.notify();
      return null;
    }
    this.invalidateAIContext('练习记录已更新，请重新生成预览');
    this.notify();
    return result;
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
      this.now(),
      this.aiForm
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
    const currentPreview = previewAssistantContext(this.appState, person, this.aiSettings, this.inputContext(), this.now(), this.aiForm);
    const approved = this.aiSettings.enabled && this.aiPreview !== null &&
      JSON.stringify(this.aiPreview) === JSON.stringify(currentPreview);
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

    const approvedPreview = this.aiPreview;
    this.aiStatus = 'running';
    this.aiMessage = '运行中…';
    this.notify();
    if (runToken !== this.aiRunToken || this.selectedId !== person.id) {
      return { status: 'preview', preview: this.aiPreview, pipeline: null, display: null, offline: false, message: '上下文已更改，请重新生成预览' };
    }

    this.aiMessages = [
      ...this.aiMessages,
      { role: 'user', text: `${person.name} · ${this.aiScene}${this.aiNote ? ` · ${this.aiNote}` : ''}` }
    ];

    this.aiAbort?.abort();
    const controller = new AbortController();
    this.aiAbort = controller;
    const result = await runAssistant({
      app: this.appState,
      settings: this.aiSettings,
      form: this.aiForm,
      personId: person.id,
      scene: this.aiScene,
      note: this.aiNote,
      approved,
      ...(approved && approvedPreview ? { approvedPreview } : {}),
      signal: controller.signal,
      now: this.now(),
      ...(this.fetchImpl ? { fetchImpl: this.fetchImpl } : {})
    });

    if (this.aiAbort === controller) this.aiAbort = null;
    if (runToken !== this.aiRunToken || this.selectedId !== person.id || controller.signal.aborted) return result;
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
