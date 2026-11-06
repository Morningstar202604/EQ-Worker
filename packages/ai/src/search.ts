/**
 * 联网搜索能力。
 *
 * 设计原则（与项目红线一致）：
 * 1. **默认关闭**。没有显式开启时，这个模块不会发出任何网络请求。
 * 2. **端侧直连**。不经过任何自建服务器，用户的 Key 与查询只发往用户自己配置的端点。
 * 3. **查询可见**。每次搜索前都能拿到将要发送的确切查询串，交给 UI 预览放行。
 * 4. **不碰通讯录**。搜索只发查询词，绝不携带人脉姓名、备注、金额等本地数据。
 *
 * 支持三种后端，覆盖「模型自带联网」与「独立搜索 API」两类：
 * - `builtin`：由模型侧执行（如智谱 GLM 的 tools:[{type:'web_search'}]），我们只负责把工具声明带上
 * - `endpoint`：独立的搜索 HTTP 接口（智谱 /web_search、自建 SearXNG、任意 JSON API）
 * - `none`：不联网
 */
import type { FetchLike } from './types';

export type SearchBackend = 'none' | 'builtin' | 'endpoint';

export interface SearchSettings {
  backend: SearchBackend;
  /** endpoint 模式下的搜索地址，例如 https://open.bigmodel.cn/api/paas/v4/web_search */
  endpoint?: string;
  /** 搜索服务的 Key。与对话 Key 分开，便于用不同的账户或额度。 */
  apiKey?: string;
  /** 单次返回条数，默认 5。 */
  count?: number;
  /** 是否限制在最近一段时间内（搜索引擎支持时生效）。 */
  recency?: 'noLimit' | 'oneDay' | 'oneWeek' | 'oneMonth' | 'oneYear';
}

export const DEFAULT_SEARCH_SETTINGS: Readonly<SearchSettings> = Object.freeze({
  backend: 'none',
  count: 5,
  recency: 'noLimit'
});

/** 一条搜索结果。只保留标题/链接/摘要，不存正文。 */
export interface SearchHit {
  title: string;
  url: string;
  snippet: string;
  /** 来源域名，便于 UI 做可信度提示。 */
  domain: string;
}

export interface SearchResult {
  query: string;
  hits: SearchHit[];
  /** 实际使用的后端，便于向用户如实展示。 */
  backend: Exclude<SearchBackend, 'none'>;
  /** 搜索耗时（毫秒）。 */
  elapsedMs: number;
}

/** 搜索结果或失败原因。用判别式联合，调用方必须显式处理失败分支。 */
export type SearchOutcome =
  | { ok: true; result: SearchResult }
  | { ok: false; error: string };

/**
 * 构造要发给模型的内置搜索工具声明（智谱 GLM 格式）。
 * 只在 backend === 'builtin' 时调用；其它情况不应把这段塞进请求。
 */
export function builtinSearchTool(count = 5): Record<string, unknown> {
  return {
    type: 'web_search',
    web_search: {
      enable: true,
      search_engine: 'search_std',
      search_result: true,
      count: String(count),
      search_recency_filter: 'noLimit'
    }
  };
}

/** 判断当前配置是否会联网。UI 用它决定是否显示隐私提示。 */
export function willUseNetwork(settings: SearchSettings | null | undefined): boolean {
  if (!settings) return false;
  return settings.backend !== 'none';
}

/**
 * 校验搜索配置。返回错误信息数组，空数组表示可用。
 * 在「开启联网」按钮上先跑这个，避免用户开了却用不了。
 */
export function validateSearchSettings(settings: SearchSettings): string[] {
  const errors: string[] = [];
  if (settings.backend === 'none') return errors;
  if (settings.backend === 'endpoint') {
    if (!settings.endpoint || !/^https?:\/\//.test(settings.endpoint)) {
      errors.push('搜索地址必须是 http(s) 开头的完整 URL');
    }
    if (!settings.apiKey || !settings.apiKey.trim()) {
      errors.push('独立搜索接口需要填写 Key（自建 SearXNG 可免 Key，但需在地址中带 token）');
    }
  }
  if (settings.count !== undefined && (!Number.isInteger(settings.count) || settings.count < 1 || settings.count > 20)) {
    errors.push('返回条数需在 1–20 之间');
  }
  return errors;
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

/** 从智谱 /web_search 的响应里取结果。字段名以官方文档为准。 */
function parseZhipuSearch(payload: unknown): SearchHit[] {
  const obj = payload as Record<string, unknown> | null;
  if (!obj) return [];
  const list = (obj.search_result ?? obj.data ?? obj.results) as unknown;
  if (!Array.isArray(list)) return [];
  return list.slice(0, 20).map((raw) => {
    const r = (raw ?? {}) as Record<string, unknown>;
    const url = String(r.link ?? r.url ?? '');
    return {
      title: String(r.title ?? '').slice(0, 200),
      url,
      snippet: String(r.content ?? r.snippet ?? '').slice(0, 400),
      domain: domainOf(url)
    };
  }).filter((h) => h.url !== '');
}

/** 从通用 JSON 里尽力取结果，兼容 SearXNG 与常见自建接口。 */
function parseGenericSearch(payload: unknown): SearchHit[] {
  const obj = payload as Record<string, unknown> | null;
  if (!obj) return [];
  const list = (obj.results ?? obj.data ?? obj.items) as unknown;
  if (!Array.isArray(list)) return [];
  return list.slice(0, 20).map((raw) => {
    const r = (raw ?? {}) as Record<string, unknown>;
    const url = String(r.url ?? r.link ?? '');
    return {
      title: String(r.title ?? r.name ?? '').slice(0, 200),
      url,
      snippet: String(r.content ?? r.snippet ?? r.description ?? '').slice(0, 400),
      domain: String(r.domain ?? '') || domainOf(url)
    };
  }).filter((h) => h.url !== '');
}

export interface SearchDeps {
  fetchImpl: FetchLike;
  now?: () => number;
}

/**
 * 执行一次联网搜索。
 *
 * 只应在调用方已经「明确开启联网 + 用户预览过 query」之后调用。
 * builtin 模式不在这里发请求——它由模型侧执行，本函数会返回空结果并说明。
 */
export async function searchWeb(
  query: string,
  settings: SearchSettings,
  deps: SearchDeps
): Promise<SearchOutcome> {
  const q = String(query || '').trim();
  if (!q) return { ok: false, error: '搜索内容为空' };
  if (settings.backend === 'none') return { ok: false, error: '联网搜索未开启' };
  if (settings.backend === 'builtin') {
    // 由模型侧执行，这里不重复请求，避免「一次查询扣两次费」。
    return { ok: false, error: '内置搜索由模型执行，无需本地请求' };
  }
  const errors = validateSearchSettings(settings);
  if (errors.length) return { ok: false, error: errors.join('；') };

  const now = deps.now ?? Date.now;
  const started = now();
  const count = settings.count ?? 5;
  const body: Record<string, unknown> = {
    search_query: q.slice(0, 70),
    search_engine: 'search_std',
    search_intent: false,
    count,
    search_recency_filter: settings.recency ?? 'noLimit',
    content_size: 'medium'
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const resp = await deps.fetchImpl(settings.endpoint as string, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${settings.apiKey ?? ''}`
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    if (!resp.ok) return { ok: false, error: `搜索服务返回 ${resp.status}` };
    const payload = await resp.json();
    const hits = parseZhipuSearch(payload);
    const finalHits = hits.length ? hits : parseGenericSearch(payload);
    return { ok: true, result: { query: q, hits: finalHits, backend: 'endpoint', elapsedMs: now() - started } };
  } catch (e) {
    const msg = e instanceof Error && e.name === 'AbortError' ? '搜索超时（15 秒）' : `搜索失败：${(e as Error).message}`;
    return { ok: false, error: msg };
  } finally {
    clearTimeout(timer);
  }
}
