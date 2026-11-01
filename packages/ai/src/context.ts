import type { ContextPolicy, PersonContext, PersonEvent, PersonInput, RedactedPreview } from './types';

export const DEFAULT_CONTEXT_POLICY: ContextPolicy = {
  name: false,
  birthday: false,
  notes: false,
  likes: false,
  taboos: false,
  events: true
};

export interface ContextBuildOptions {
  now?: Date;
  policy?: Partial<ContextPolicy> & { allowName?: boolean };
}

export interface PreviewPayload {
  system: string;
  user: string;
  fields?: string[];
  redactions?: string[];
}

const SECRET_KEY_PATTERN = /^(?:api[-_]?key|authorization|access[-_]?token|refresh[-_]?token|token|secret|client[-_]?secret|password)$/i;
const SECRET_VALUE_PATTERN = /(sk-[A-Za-z0-9_-]{6,}|Bearer\s+[A-Za-z0-9._~+/=-]+|(?:api[-_]?key|authorization|token|secret|password)\s*[:=]\s*(?:Bearer\s+)?\S+)/gi;

export function maskSecrets(text: string): string {
  return text.replace(SECRET_VALUE_PATTERN, '[REDACTED]');
}

export function scrubSecrets(value: unknown): unknown {
  if (typeof value === 'string') {
    return maskSecrets(value);
  }
  if (Array.isArray(value)) {
    return value.map(scrubSecrets);
  }
  if (typeof value === 'object' && value !== null) {
    const output: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      output[key] = SECRET_KEY_PATTERN.test(key) ? '[REDACTED]' : scrubSecrets(entry);
    }
    return output;
  }
  return value;
}

function resolvePolicy(policy?: Partial<ContextPolicy> & { allowName?: boolean }): ContextPolicy {
  return {
    name: policy?.name ?? policy?.allowName ?? DEFAULT_CONTEXT_POLICY.name,
    birthday: policy?.birthday ?? DEFAULT_CONTEXT_POLICY.birthday,
    notes: policy?.notes ?? DEFAULT_CONTEXT_POLICY.notes,
    likes: policy?.likes ?? DEFAULT_CONTEXT_POLICY.likes,
    taboos: policy?.taboos ?? DEFAULT_CONTEXT_POLICY.taboos,
    events: policy?.events ?? DEFAULT_CONTEXT_POLICY.events
  };
}

function hasText(value: string | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function parseBirthday(value: string): { month: number; day: number } | null {
  const match = value.match(/^(?:\d{4}-)?(\d{1,2})-(\d{1,2})$/);
  if (!match) {
    return null;
  }
  const month = Number(match[1]);
  const day = Number(match[2]);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  return { month, day };
}

function birthdayWindow(birthday: string | undefined, now: Date): { known: boolean; withinSevenDays: boolean; monthDay?: string } {
  if (!hasText(birthday)) {
    return { known: false, withinSevenDays: false };
  }
  const parsed = parseBirthday(birthday.trim());
  if (!parsed) {
    return { known: false, withinSevenDays: false };
  }
  const monthDay = `${String(parsed.month).padStart(2, '0')}-${String(parsed.day).padStart(2, '0')}`;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let next = new Date(today.getFullYear(), parsed.month - 1, parsed.day);
  if (next.getMonth() !== parsed.month - 1) {
    next = new Date(today.getFullYear(), parsed.month - 1, 28);
  }
  if (next.getTime() < today.getTime()) {
    next = new Date(today.getFullYear() + 1, parsed.month - 1, parsed.day);
    if (next.getMonth() !== parsed.month - 1) {
      next = new Date(today.getFullYear() + 1, parsed.month - 1, 28);
    }
  }
  const diffDays = Math.round((next.getTime() - today.getTime()) / 86_400_000);
  return { known: true, withinSevenDays: diffDays <= 6, monthDay };
}

function amountRange(amount: number): string {
  if (amount < 200) {
    return '200元以下';
  }
  if (amount < 500) {
    return '200-500元';
  }
  if (amount < 1000) {
    return '500-1000元';
  }
  if (amount < 2000) {
    return '1000-2000元';
  }
  if (amount < 5000) {
    return '2000-5000元';
  }
  return '5000元以上';
}

function eventLine(event: PersonEvent): string | null {
  const type = (event.type ?? event.kind ?? '').trim();
  if (!type) {
    return null;
  }
  const amount = typeof event.amount === 'number' && Number.isFinite(event.amount) ? `（${amountRange(event.amount)}）` : '';
  return `${type}${amount}`;
}

export function buildPersonContext(
  person: PersonInput,
  policy?: Partial<ContextPolicy> & { allowName?: boolean },
  options: ContextBuildOptions = {}
): PersonContext {
  const resolved = resolvePolicy(policy ?? options.policy);
  const now = options.now ?? new Date();
  const fields: string[] = [];
  const redactions: string[] = [];
  const lines: string[] = [];

  const relation = person.identity ?? person.relation ?? '朋友';
  fields.push('relation');
  lines.push(`关系：${relation}`);

  if (resolved.name) {
    const name = hasText(person.name) ? person.name.trim() : '对方';
    fields.push('name');
    lines.push(`称呼：${name}`);
  } else {
    if (hasText(person.name)) {
      redactions.push('name');
    }
    lines.push('称呼：对方');
  }

  const window = birthdayWindow(person.birthday, now);
  if (resolved.birthday) {
    if (window.known && window.monthDay) {
      fields.push('birthday');
      lines.push(`生日：${window.monthDay}`);
    }
    if (window.known) {
      fields.push('birthdayWindow');
      lines.push(`近7天内有生日：${window.withinSevenDays ? '是' : '否'}`);
    }
  } else {
    if (window.known) {
      redactions.push('birthday');
      fields.push('birthdayWindow');
      lines.push(`近7天内有生日：${window.withinSevenDays ? '是' : '否'}`);
    }
  }

  const note = person.note ?? person.notes;
  if (resolved.notes) {
    if (hasText(note)) {
      fields.push('notes');
      lines.push(`备注：${note.trim()}`);
    }
  } else if (hasText(note)) {
    redactions.push('notes');
  }

  if (resolved.likes) {
    if (hasText(person.likes)) {
      fields.push('likes');
      lines.push(`喜好：${person.likes.trim()}`);
    }
  } else if (hasText(person.likes)) {
    redactions.push('likes');
  }

  if (resolved.taboos) {
    if (hasText(person.taboos)) {
      fields.push('taboos');
      lines.push(`忌讳：${person.taboos.trim()}`);
    }
  } else if (hasText(person.taboos)) {
    redactions.push('taboos');
  }

  if (resolved.events) {
    const events = (person.events ?? []).map(eventLine).filter((line): line is string => line !== null);
    if (events.length > 0) {
      fields.push('eventTypes', 'amountRange');
      lines.push(`往来事件：${events.join('；')}`);
    }
  } else if ((person.events ?? []).length > 0) {
    redactions.push('events');
  }

  const system = [
    '你是 EQ-Worker 的中文关系参谋，只在本地设备上协助用户处理人情往来。',
    '只使用用户消息中明确给出的信息，不猜测、不补造姓名、生日、住址、联系方式等个人身份信息。',
    '输出保持克制、具体、可执行，避免空泛客套。'
  ].join('');

  return {
    system,
    user: lines.join('\n'),
    fields,
    redactions
  };
}

export function redactPreview(payload: PreviewPayload): RedactedPreview {
  let masked = 0;
  const replace = (value: string): string =>
    value.replace(SECRET_VALUE_PATTERN, () => {
      masked += 1;
      return '[REDACTED]';
    });

  return {
    system: replace(payload.system),
    user: replace(payload.user),
    fields: [...(payload.fields ?? [])],
    redactions: [...(payload.redactions ?? [])],
    masked
  };
}
