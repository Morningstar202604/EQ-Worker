import { escapeHtml } from './html';
import type { AssistantDisplay } from '../assistant';

export interface AIMessage {
  role: 'user' | 'assistant';
  text: string;
  offline?: boolean;
}

export interface AIData {
  enabled: boolean;
  mock: boolean;
  personName: string | null;
  scene: string;
  note: string;
  preview: { system: string; user: string; fields: string[]; redactions: string[]; masked: number } | null;
  result: AssistantDisplay | null;
  status: 'idle' | 'preview' | 'ok' | 'offline' | 'disabled' | 'running';
  message: string;
  messages: AIMessage[];
  configError: string | null;
}

export interface AIProviderView {
  kind: 'openai' | 'anthropic' | 'custom';
  baseUrl: string;
  model: string;
  apiKey: string;
  mock: boolean;
}

export interface AIPolicyView {
  key: string;
  label: string;
  hint: string;
  checked: boolean;
}

export interface AIViewData extends AIData {
  provider: AIProviderView;
  policies: AIPolicyView[];
  persons: Array<{ id: string; name: string }>;
  selectedPersonId: string | null;
  hasPerson: boolean;
  offline: boolean;
}

function renderMessages(messages: AIMessage[]): string {
  if (!messages.length) {
    return '<p class="muted">开启后，这里会显示本地生成的话术与建议。</p>';
  }
  return messages
    .map(
      (message) => [
        `<article class="bubble ${message.role}${message.offline ? ' offline' : ''}">`,
        message.offline ? '<span class="offline-tag">离线建议</span>' : '',
        `<p>${escapeHtml(message.text)}</p>`,
        '</article>'
      ].join('')
    )
    .join('\n');
}

function renderResult(result: AssistantDisplay): string {
  const variants = result.variants.length
    ? [
        '<section class="detail-section">',
        '<h3>话术</h3>',
        '<div class="variants">',
        ...result.variants.map(
          (variant) => [
            '<article class="variant">',
            `<span class="variant-tone">${escapeHtml(variant.tone)}</span>`,
            `<p>${escapeHtml(variant.text)}</p>`,
            '<button type="button" class="btn small ghost" data-act="copy-variant" data-text="' + escapeHtml(variant.text) + '" aria-label="复制' + escapeHtml(variant.tone) + '">复制</button>',
            '</article>'
          ].join('')
        ),
        '</div>',
        '</section>'
      ].join('\n')
    : '';

  const gift = result.gift
    ? [
        '<section class="detail-section">',
        '<h3>礼金参考</h3>',
        `<p class="gift-range">${escapeHtml(`¥${result.gift.low} - ¥${result.gift.high}`)}（中位 ${escapeHtml(`¥${result.gift.mid}`)}）</p>`,
        result.gift.reasons.length
          ? `<ul class="tips">${result.gift.reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join('')}</ul>`
          : '',
        '</section>'
      ].join('\n')
    : '';

  const tips = result.tips.length
    ? [
        '<section class="detail-section">',
        '<h3>复盘建议</h3>',
        `<ul class="tips">${result.tips.map((tip) => `<li>${escapeHtml(tip)}</li>`).join('')}</ul>`,
        '</section>'
      ].join('\n')
    : '';

  const advice = result.advice ? `<p class="relation-read">${escapeHtml(result.advice)}</p>` : '';
  const empty = !variants && !gift && !tips ? '<p class="muted">模型没有返回可用内容。</p>' : '';
  return `<div class="ai-result">${advice}${variants}${gift}${tips}${empty}</div>`;
}

export function renderAI(data: AIViewData): string {
  const disabled = !data.enabled;
  const disabledAttr = disabled ? ' disabled' : '';

  const policyItems = data.policies
    .map(
      (policy) => [
        '<label class="check">',
        `<input type="checkbox" data-act="ai-policy" data-key="${escapeHtml(policy.key)}"${policy.checked ? ' checked' : ''}${disabledAttr}>`,
        `<span><strong>${escapeHtml(policy.label)}</strong><em>${escapeHtml(policy.hint)}</em></span>`,
        '</label>'
      ].join('')
    )
    .join('');

  const preview = data.preview
    ? [
        '<section class="detail-section preview">',
        '<h3>发送前预览</h3>',
        `<p class="muted">将以如下内容发送，敏感字段已按勾选脱敏${data.preview.masked ? `，已遮蔽 ${data.preview.masked} 处疑似密钥` : ''}。</p>`,
        '<div class="preview-block"><h4>System</h4><pre>' + escapeHtml(data.preview.system) + '</pre></div>',
        '<div class="preview-block"><h4>User</h4><pre>' + escapeHtml(data.preview.user) + '</pre></div>',
        data.preview.redactions.length
          ? `<p class="muted">已排除字段：${escapeHtml(data.preview.redactions.join('、'))}</p>`
          : '<p class="muted">没有需要额外排除的字段。</p>',
        '</section>'
      ].join('\n')
    : '';

  const banner = disabled
    ? [
        '<section class="card ai-disabled compact" aria-labelledby="ai-off-title">',
        '<div class="ai-disabled-mark" aria-hidden="true">AI</div>',
        '<div>',
        '<h2 id="ai-off-title">AI 未启用</h2>',
        '<p>默认关闭：当前页面不会发起任何网络请求。开启后需要先生成发送前预览，确认后才会调用模型。Key 只保存在本标签页的 sessionStorage，关闭标签页即失效。</p>',
        '</div>',
        '</section>'
      ].join('\n')
    : '';

  return [
    '<section class="view ai" aria-labelledby="ai-title">',
    '<header class="view-head">',
    '<div>',
    '<p class="eyebrow">AI 助手</p>',
    '<h1 id="ai-title">AI 助手</h1>',
    `<p class="muted">${data.personName ? `当前对象：${escapeHtml(data.personName)}` : '请先选择人脉'}</p>`,
    '</div>',
    disabled
      ? '<button type="button" class="btn primary" data-act="ai-enable" aria-label="开启 AI 助手">开启 AI 助手</button>'
      : '<button type="button" class="btn ghost" data-act="ai-disable" aria-label="关闭 AI 助手">关闭 AI</button>',
    '</header>',
    banner,
    '<div class="ai-layout">',
    '<div class="ai-left">',
    '<section class="card">',
    '<h2>Provider 配置</h2>',
    data.configError ? `<p class="error">${escapeHtml(data.configError)}</p>` : '',
    '<div class="field"><span>类型</span>',
    '<select data-act="ai-kind" aria-label="Provider 类型">',
    ['openai', 'anthropic', 'custom']
      .map((kind) => `<option value="${kind}"${kind === data.provider.kind ? ' selected' : ''}>${kind}</option>`)
      .join(''),
    '</select></div>',
    `<label class="field"><span>Base URL</span><input type="url" value="${escapeHtml(data.provider.baseUrl)}" data-act="ai-baseurl" placeholder="https://api.example.com/v1" aria-label="Provider Base URL"></label>`,
    `<label class="field"><span>Model</span><input type="text" value="${escapeHtml(data.provider.model)}" data-act="ai-model" placeholder="gpt-4o-mini" aria-label="模型名称"></label>`,
    `<label class="field"><span>API Key</span><input type="password" value="" data-act="ai-apikey" placeholder="${data.provider.apiKey ? '已配置，重新输入可替换' : 'sk-...'}" autocomplete="off" aria-label="API Key"${data.provider.apiKey ? ' data-key-configured="true"' : ''}></label>`,
    data.provider.apiKey ? '<button type="button" class="btn ghost small" data-act="ai-clear-key" aria-label="清除已配置的 API Key">清除已配置 Key</button>' : '',
    '<p class="risk">Key 只写入 sessionStorage，关闭标签页即清除；不要使用长期有效的生产密钥。已配置的 Key 不回填到 DOM，重新输入可替换；点击清除按钮会删除现有 Key。</p>',
    '<label class="check"><input type="checkbox" data-act="ai-mock"' + (data.mock ? ' checked' : '') + '><span><strong>使用离线 Mock Provider</strong><em>不需要真实 Key，适合演示</em></span></label>',
    '</section>',
    '<section class="card">',
    '<h2>发送内容</h2>',
    '<label class="field"><span>对象</span>',
    '<select data-act="ai-person" aria-label="选择人脉">',
    data.persons.length
      ? data.persons
          .map(
            (person) =>
              `<option value="${escapeHtml(person.id)}"${person.id === data.selectedPersonId ? ' selected' : ''}>${escapeHtml(person.name)}</option>`
          )
          .join('')
      : '<option value="">暂无数据</option>',
    '</select></label>',
    `<label class="field"><span>场景</span><input type="text" value="${escapeHtml(data.scene)}" data-act="ai-scene" placeholder="例如：生日祝福" aria-label="场景"></label>`,
    `<label class="field"><span>补充说明</span><textarea data-act="ai-note" rows="3" aria-label="补充说明">${escapeHtml(data.note)}</textarea></label>`,
    '<h3 class="subhead">可发送的 PII 字段</h3>',
    `<div class="checks">${policyItems}</div>`,
    '</section>',
    '</div>',
    '<div class="ai-right">',
    '<section class="card" aria-labelledby="preview-title">',
    `<div class="card-head"><h2 id="preview-title">预览与运行</h2><span class="status-pill status-${escapeHtml(data.status)}">${escapeHtml(data.message)}</span></div>`,
    '<div class="run-actions">',
    `<button type="button" class="btn ghost" data-act="ai-preview" aria-label="生成发送前预览"${disabledAttr}>生成预览</button>`,
    `<button type="button" class="btn primary" data-act="ai-run" aria-label="确认并运行 AI 助手"${disabledAttr || data.status === 'running' ? ' disabled' : ''}>${data.status === 'running' ? '运行中…' : '确认并运行'}</button>`,
    '</div>',
    disabled ? '<p class="muted">开启 AI 后即可生成预览；未开启时按钮保持禁用，也不会发送请求。</p>' : '',
    preview,
    '</section>',
    '<section class="card" aria-labelledby="result-title">',
    '<h2 id="result-title">结果</h2>',
    data.offline ? '<p class="offline-note">离线建议 · 由本地规则生成，未经过模型</p>' : '',
    `<div class="bubbles">${renderMessages(data.messages)}</div>`,
    data.result ? renderResult(data.result) : '',
    '</section>',
    '</div>',
    '</div>',
    '</section>'
  ].join('\n');
}
