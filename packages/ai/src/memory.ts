import { scrubSecrets } from './context';
import type { ChatMessage } from './types';

export interface MemoryEntry {
  personId: string;
  message: ChatMessage;
  at: number;
}

export interface MemoryExportPerson {
  personId: string;
  messages: ChatMessage[];
  summary: string | null;
}

export interface MemoryExport {
  version: 1;
  window: number;
  persons: MemoryExportPerson[];
}

export interface MemoryStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface MemoryStoreOptions {
  window?: number;
  storage?: MemoryStorage;
  storageKey?: string;
  now?: () => number;
}

const DEFAULT_WINDOW = 8;
const DEFAULT_STORAGE_KEY = 'eqworker.ai.memory.v1';
const MAX_SUMMARY_CHARS = 240;

export class MemoryStore {
  private readonly window: number;
  private readonly storage?: MemoryStorage;
  private readonly storageKey: string;
  private readonly now: () => number;
  private readonly entries = new Map<string, MemoryEntry[]>();
  private readonly archived = new Map<string, ChatMessage[]>();

  constructor(options: MemoryStoreOptions = {}) {
    this.window = Math.max(1, Math.floor(options.window ?? DEFAULT_WINDOW));
    this.storage = options.storage;
    this.storageKey = options.storageKey ?? DEFAULT_STORAGE_KEY;
    this.now = options.now ?? (() => Date.now());
    this.restore();
  }

  add(personId: string, message: ChatMessage): void {
    const key = normalizePersonId(personId);
    const content = message.content.trim();
    if (!key || !content) {
      return;
    }

    const list = this.entries.get(key) ?? [];
    list.push({ personId: key, message: { role: message.role, content }, at: this.now() });

    while (list.length > this.window) {
      const dropped = list.shift();
      if (dropped) {
        const archive = this.archived.get(key) ?? [];
        archive.push(dropped.message);
        this.archived.set(key, archive);
      }
    }

    this.entries.set(key, list);
    this.persist();
  }

  recent(personId: string, limit?: number): ChatMessage[] {
    const key = normalizePersonId(personId);
    const list = this.entries.get(key) ?? [];
    const size = Math.max(0, Math.floor(limit ?? this.window));
    return list.slice(-size).map((entry) => ({ ...entry.message }));
  }

  summary(personId: string): string | null {
    const key = normalizePersonId(personId);
    const current = this.entries.get(key) ?? [];
    const older = this.archived.get(key) ?? [];
    if (current.length === 0 && older.length === 0) {
      return null;
    }

    const highlights = [...older, ...current.map((entry) => entry.message)]
      .filter((message) => message.role === 'user')
      .map((message) => message.content.trim())
      .filter((content) => content.length > 0)
      .slice(-3)
      .map((content) => (content.length > 50 ? `${content.slice(0, 50)}…` : content));

    if (highlights.length === 0) {
      return `共 ${older.length + current.length} 条消息`;
    }
    return clip(`更早对话摘要：${highlights.join(' / ')}`, MAX_SUMMARY_CHARS);
  }

  clear(personId?: string): void {
    if (personId === undefined) {
      this.entries.clear();
      this.archived.clear();
    } else {
      const key = normalizePersonId(personId);
      this.entries.delete(key);
      this.archived.delete(key);
    }
    this.persist();
  }

  export(): MemoryExport {
    return {
      version: 1,
      window: this.window,
      persons: [...this.entries.keys()].map((personId) => ({
        personId,
        messages: sanitizeMessages(this.recent(personId, this.window)),
        summary: sanitizeText(this.summary(personId))
      }))
    };
  }

  serialize(): string {
    return JSON.stringify(this.export());
  }

  private persist(): void {
    if (!this.storage) {
      return;
    }
    try {
      this.storage.setItem(this.storageKey, this.serialize());
    } catch {
      return;
    }
  }

  private restore(): void {
    if (!this.storage) {
      return;
    }
    let raw: string | null = null;
    try {
      raw = this.storage.getItem(this.storageKey);
    } catch {
      return;
    }
    if (!raw) {
      return;
    }
    try {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null) {
        return;
      }
      const persons = (parsed as Record<string, unknown>).persons;
      if (!Array.isArray(persons)) {
        return;
      }
      for (const person of persons) {
        if (typeof person !== 'object' || person === null) {
          continue;
        }
        const record = person as Record<string, unknown>;
        const personId = typeof record.personId === 'string' ? record.personId : '';
        const messages = Array.isArray(record.messages) ? record.messages : [];
        if (!personId) {
          continue;
        }
        const list: MemoryEntry[] = [];
        for (const message of messages) {
          if (typeof message !== 'object' || message === null) {
            continue;
          }
          const entry = message as Record<string, unknown>;
          const role = entry.role;
          const content = entry.content;
          if ((role === 'user' || role === 'assistant' || role === 'system') && typeof content === 'string') {
            list.push({ personId, message: { role, content }, at: this.now() });
          }
        }
        this.entries.set(personId, list.slice(-this.window));
      }
    } catch {
      this.entries.clear();
      this.archived.clear();
    }
  }
}

function sanitizeText(text: string | null): string | null {
  if (text === null) {
    return null;
  }
  const scrubbed = scrubSecrets(text);
  return typeof scrubbed === 'string' ? scrubbed : text;
}

function sanitizeMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages.map((message) => ({
    role: message.role,
    content: sanitizeText(message.content) ?? ''
  }));
}

export function createLocalStorageAdapter(storage?: MemoryStorage): MemoryStorage | undefined {
  if (storage) {
    return storage;
  }
  const candidate = (globalThis as { localStorage?: MemoryStorage }).localStorage;
  if (!candidate) {
    return undefined;
  }
  try {
    const probeKey = '__eqworker_ai_storage_probe__';
    candidate.setItem(probeKey, '1');
    candidate.removeItem(probeKey);
    return candidate;
  } catch {
    return undefined;
  }
}

function normalizePersonId(personId: string): string {
  return personId.trim();
}

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
