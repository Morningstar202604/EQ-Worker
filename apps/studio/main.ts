import {
  EVENT_TYPES,
  OCCASIONS,
  buildScripts,
  fmtMoney,
  giftAdvice,
  type EventType,
  type Occasion
} from '../../packages/core/src/index';
import type { ContextPolicy } from '../../packages/ai/src/index';
import { escapeHtml } from './views/html';
import { StudioStore, type StudioView } from './state';
import { renderEmptyLanding } from './views/empty';
import { renderOverviewView } from './ui/overview';
import { renderPersonsView } from './ui/persons';
import { renderLedgerView } from './ui/ledger';
import { renderAIView } from './ui/ai';

const VIEWS: Array<{ id: StudioView; label: string; icon: string }> = [
  { id: 'overview', label: '仪表盘', icon: '◈' },
  { id: 'persons', label: '人脉', icon: '☰' },
  { id: 'ledger', label: '账本与洞察', icon: '¥' },
  { id: 'ai', label: 'AI 助手', icon: '✧' }
];

function renderShell(studio: StudioStore): string {
  const view = studio.getView();
  const nav = VIEWS.map(
    (item) => [
      `<button type="button" class="nav-item${item.id === view ? ' active' : ''}" data-act="nav" data-view="${item.id}" aria-label="打开${item.label}"${item.id === view ? ' aria-current="page"' : ''}>`,
      `<span class="nav-icon" aria-hidden="true">${item.icon}</span>`,
      `<span class="nav-label">${item.label}</span>`,
      `</button>`
    ].join('')
  ).join('');

  return [
    '<div class="app-shell">',
    '<aside class="sidebar">',
    '<div class="brand">',
    '<span class="brand-mark" aria-hidden="true">EQ</span>',
    '<div><strong>EQ-Worker</strong><span>人情世故工作台</span></div>',
    '</div>',
    `<nav class="nav" aria-label="主导航">${nav}</nav>`,
    '<div class="sidebar-foot">',
    '<button type="button" class="btn ghost small" data-act="export" aria-label="导出当前数据 JSON">导出数据</button>',
    '<button type="button" class="btn ghost small" data-act="import-trigger" aria-label="导入 JSON 数据">导入 JSON</button>',
    '<p class="muted tiny">数据只保存在本机浏览器</p>',
    '</div>',
    '</aside>',
    '<main class="main" id="main">',
    renderView(studio),
    '</main>',
    '</div>',
    '<input type="file" id="import-file" accept="application/json,.json" hidden aria-label="选择要导入的 JSON 文件">',
    '<div class="dialog-root" id="dialog-root"></div>'
  ].join('\n');
}

function renderView(studio: StudioStore): string {
  switch (studio.getView()) {
    case 'overview':
      return studio.getState().persons.length > 0 ? renderOverviewView(studio) : renderEmptyLanding();
    case 'persons':
      return renderPersonsView(studio);
    case 'ledger':
      return renderLedgerView(studio);
    case 'ai':
      return renderAIView(studio);
    default:
      return renderOverviewView(studio);
  }
}

function parseActionArg(arg: string): { sceneId: string; personId: string } {
  const [sceneId = '', personId = ''] = arg.split('|');
  return { sceneId, personId };
}

function renderDialogRoot(doc: Document): HTMLElement | null {
  return doc.querySelector<HTMLElement>('#dialog-root');
}

function closeDialog(doc: Document): void {
  const root = renderDialogRoot(doc);
  if (root) root.innerHTML = '';
}

function openDialog(doc: Document, title: string, body: string): void {
  const root = renderDialogRoot(doc);
  if (!root) return;
  root.innerHTML = [
    '<div class="dialog-backdrop" data-act="dialog-close"></div>',
    '<section class="dialog card" role="dialog" aria-modal="true" aria-label="' + escapeHtml(title) + '">',
    '<header class="dialog-head">',
    `<h2>${escapeHtml(title)}</h2>`,
    '<button type="button" class="icon-btn" data-act="dialog-close" aria-label="关闭对话框">×</button>',
    '</header>',
    `<div class="dialog-body">${body}</div>`,
    '</section>'
  ].join('\n');
  const closeBtn = root.querySelector<HTMLElement>('.icon-btn');
  closeBtn?.focus();
}

function scriptDialog(studio: StudioStore, sceneId: string, personId: string): string {
  const result = buildScripts(studio.getState(), sceneId, personId, '');
  const variants = result.variants
    .map(
      (variant) => [
        '<article class="variant">',
        `<span class="variant-tone">${escapeHtml(variant.tone)}</span>`,
        `<p>${escapeHtml(variant.text)}</p>`,
        `<button type="button" class="btn small ghost" data-act="copy-text" data-text="${escapeHtml(variant.text)}" aria-label="复制${escapeHtml(variant.tone)}">复制</button>`,
        '</article>'
      ].join('')
    )
    .join('');
  return [
    `<p class="muted">场景：${escapeHtml(result.scene.label)} · ${escapeHtml(result.person ? result.person.name : '通用')}</p>`,
    `<p class="hint">${escapeHtml(result.scene.hint)}</p>`,
    `<div class="variants">${variants}</div>`
  ].join('');
}

function giftDialog(studio: StudioStore, personId: string): string {
  const advice = giftAdvice(studio.getState(), personId, '还礼');
  return [
    `<p class="gift-range">${escapeHtml(fmtMoney(advice.low))} - ${escapeHtml(fmtMoney(advice.high))}</p>`,
    `<p class="muted">中位 ${escapeHtml(fmtMoney(advice.mid))} · ${escapeHtml(advice.identity)} · ${escapeHtml(advice.occasion)}</p>`,
    `<ul class="tips">${advice.reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join('')}</ul>`,
    `<p class="hint">${escapeHtml(advice.note)}</p>`
  ].join('');
}

function eventDialog(studio: StudioStore, personId: string): string {
  const person = studio.getState().persons.find((item) => item.id === personId);
  if (!person) return '<p class="muted">未找到该联系人。</p>';
  const types = (Object.keys(EVENT_TYPES) as EventType[])
    .map((type) => `<option value="${type}">${escapeHtml(EVENT_TYPES[type].label)}</option>`)
    .join('');
  const occasions = OCCASIONS.map((occasion) => `<option value="${escapeHtml(occasion)}">${escapeHtml(occasion)}</option>`).join('');
  return [
    `<p class="muted">为 ${escapeHtml(person.name)} 记一笔往来</p>`,
    '<form class="event-form" data-form="event">',
    `<input type="hidden" name="personId" value="${escapeHtml(personId)}">`,
    `<label class="field"><span>类型</span><select name="type" aria-label="往来类型">${types}</select></label>`,
    '<label class="field"><span>标题</span><input type="text" name="title" maxlength="80" placeholder="例如：生日送了本书" aria-label="往来标题"></label>',
    '<label class="field"><span>金额</span><input type="number" name="amount" min="0" step="10" value="0" aria-label="金额"></label>',
    '<label class="field"><span>方向</span><select name="dir" aria-label="金额方向"><option value="none">无金额</option><option value="out">我给出</option><option value="in">我收到</option></select></label>',
    `<label class="field"><span>场合</span><select name="occasion" aria-label="场合">${occasions}</select></label>`,
    '<div class="dialog-actions">',
    '<button type="submit" class="btn primary" aria-label="保存这笔往来">保存</button>',
    '<button type="button" class="btn ghost" data-act="dialog-close" aria-label="取消">取消</button>',
    '</div>',
    '</form>'
  ].join('');
}

function handleCoreAction(studio: StudioStore, doc: Document, action: string, arg: string, personId: string): void {
  if (action === 'scriptModal') {
    const parsed = parseActionArg(arg);
    openDialog(doc, '话术参谋', scriptDialog(studio, parsed.sceneId || 'reconnect', parsed.personId || personId));
    return;
  }
  if (action === 'giftModal') {
    openDialog(doc, '回礼参谋', giftDialog(studio, arg || personId));
    return;
  }
  if (action === 'eventQuick') {
    openDialog(doc, '记一笔往来', eventDialog(studio, arg || personId));
    return;
  }
  if (action === 'go') {
    const target = arg as StudioView;
    if (VIEWS.some((view) => view.id === target)) studio.setView(target);
    return;
  }
  if (action === 'quickDone') {
    studio.completeReminder(arg);
  }
}

export function mountStudio(studio: StudioStore, doc: Document): () => void {
  const root = doc.querySelector<HTMLElement>('#studio');
  if (!root) return () => undefined;

  const render = (): void => {
    const active = doc.activeElement as HTMLInputElement | HTMLTextAreaElement | null;
    const activeAct = active && active.dataset ? active.dataset.act : undefined;
    const selectionStart = active && typeof active.selectionStart === 'number' ? active.selectionStart : null;
    root.innerHTML = renderShell(studio);
    if (activeAct) {
      const next = root.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[data-act="${activeAct}"]`);
      if (next) {
        next.focus();
        if (selectionStart !== null && typeof next.setSelectionRange === 'function') {
          try {
            next.setSelectionRange(selectionStart, selectionStart);
          } catch {
            void 0;
          }
        }
      }
    }
  };

  const unsubscribe = studio.subscribe(render);
  render();

  const onClick = (event: Event): void => {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    const el = target.closest<HTMLElement>('[data-act]');
    if (!el) return;
    const act = el.dataset.act ?? '';

    if (act === 'nav') {
      const view = el.dataset.view as StudioView | undefined;
      if (view) studio.setView(view);
      return;
    }
    if (act === 'load-demo') {
      studio.loadDemo();
      return;
    }
    if (act === 'import-trigger') {
      doc.querySelector<HTMLInputElement>('#import-file')?.click();
      return;
    }
    if (act === 'export') {
      const json = studio.getStore().exportJSON();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = doc.createElement('a');
      link.href = url;
      link.download = 'eq-worker-studio.json';
      link.click();
      URL.revokeObjectURL(url);
      return;
    }
    if (act === 'person-open') {
      const id = el.dataset.id ?? '';
      studio.selectPerson(id);
      if (studio.getView() !== 'persons') studio.setView('persons');
      return;
    }
    if (act === 'action-primary' || act === 'action-secondary') {
      const action = el.dataset.action ?? '';
      const arg = el.dataset.arg ?? '';
      const personId = el.dataset.person ?? '';
      handleCoreAction(studio, doc, action, arg, personId);
      return;
    }
    if (act === 'dialog-close') {
      closeDialog(doc);
      return;
    }
    if (act === 'copy-text' || act === 'copy-variant') {
      const text = el.dataset.text ?? '';
      void navigator.clipboard?.writeText(text);
      return;
    }
    if (act === 'ai-enable') {
      studio.enableAI();
      return;
    }
    if (act === 'ai-disable') {
      studio.disableAI();
      return;
    }
    if (act === 'ai-clear-key') {
      studio.updateAIForm({ apiKey: '' });
      return;
    }
    if (act === 'ai-preview') {
      studio.previewAI();
      return;
    }
    if (act === 'ai-run') {
      void studio.runAI();
    }
  };

  const onChange = (event: Event): void => {
    const target = event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
    if (!target) return;
    const act = target.dataset.act ?? '';
    if (act === 'person-identity') {
      studio.setIdentityFilter(target.value);
      return;
    }
    if (act === 'ai-kind') {
      studio.updateAIForm({ kind: target.value as 'openai' | 'anthropic' | 'custom' });
      return;
    }
    if (act === 'ai-baseurl') {
      studio.updateAIForm({ baseUrl: target.value });
      return;
    }
    if (act === 'ai-model') {
      studio.updateAIForm({ model: target.value });
      return;
    }
    if (act === 'ai-apikey') {
      studio.updateAIForm({ apiKey: target.value });
      return;
    }
    if (act === 'ai-mock') {
      studio.updateAIForm({ mock: (target as HTMLInputElement).checked });
      return;
    }
    if (act === 'ai-policy') {
      const key = target.dataset.key;
      if (key) studio.togglePolicy(key as keyof ContextPolicy, (target as HTMLInputElement).checked);
      return;
    }
    if (act === 'ai-person') {
      studio.setAIPerson(target.value);
    }
  };

  const onInput = (event: Event): void => {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement | null;
    if (!target) return;
    const act = target.dataset.act ?? '';
    if (act === 'person-search') studio.setQuery(target.value);
    else if (act === 'ai-scene') studio.setAIScene(target.value);
    else if (act === 'ai-note') studio.setAINote(target.value);
  };

  const onSubmit = (event: Event): void => {
    const form = event.target as HTMLFormElement | null;
    if (!form || form.dataset.form !== 'event') return;
    event.preventDefault();
    const data = new FormData(form);
    const personId = String(data.get('personId') ?? '');
    const type = String(data.get('type') ?? 'other') as EventType;
    const amount = Number(data.get('amount') ?? 0);
    const dirRaw = String(data.get('dir') ?? 'none');
    const dir = dirRaw === 'in' || dirRaw === 'out' ? dirRaw : 'none';
    const title = String(data.get('title') ?? '');
    const occasion = String(data.get('occasion') ?? '其他') as Occasion;
    studio.addEvent({ personId, type, title, amount, dir, occasion });
    closeDialog(doc);
  };

  const onFile = async (event: Event): Promise<void> => {
    const input = event.target as HTMLInputElement;
    if (input.id !== 'import-file') return;
    const file = input.files?.[0];
    if (!file) return;
    const text = await file.text();
    const outcome = studio.importJSON(text);
    if (!outcome.ok) {
      openDialog(doc, '导入失败', `<p class="error">${escapeHtml(outcome.warnings.join('；'))}</p>`);
    }
    input.value = '';
  };

  doc.addEventListener('click', onClick);
  doc.addEventListener('change', onChange);
  doc.addEventListener('input', onInput);
  doc.addEventListener('submit', onSubmit);
  doc.addEventListener('change', onFile);

  return () => {
    unsubscribe();
    doc.removeEventListener('click', onClick);
    doc.removeEventListener('change', onChange);
    doc.removeEventListener('input', onInput);
    doc.removeEventListener('submit', onSubmit);
    doc.removeEventListener('change', onFile);
  };
}

export function boot(): void {
  if (typeof document === 'undefined') return;
  const studio = new StudioStore();
  mountStudio(studio, document);
}

if (typeof document !== 'undefined' && document.querySelector('#studio')) {
  boot();
}
