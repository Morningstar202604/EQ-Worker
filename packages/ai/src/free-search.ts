/**
 * 免费搜索适配器：不依赖任何付费 API Key。
 *
 * 实测背景（本机网络，2026-11-07）：
 *   - Bing Search API（付费版）已于 2025-08-11 完全退役，无法新注册
 *   - DuckDuckGo / Brave / 公共 SearXNG 实例：全部连接超时
 *   - cn.bing.com 可访问，且支持 `format=rss` 返回结构化 XML
 *   - sogou.com 可访问，HTML 可解析
 *   - baidu.com 有安全验证墙，不可用
 *
 * 因此本模块以 **Bing RSS** 为主源，搜狗为备源。
 *
 * 合规声明（重要）：
 * Bing RSS 的版权条款写明「仅限个人非商业用途，在 RSS 聚合器中呈现」。
 * 本项目的许可同样是 CC BY-NC 4.0（非商业），用途一致。
 * 如果将来用于商业场景，必须换成官方 API 或自建 SearXNG，不能继续用这个通道。
 */

import type { FetchLike } from './types';
import { looksIrrelevant, planQueries } from './query-plan';

export interface FreeSearchHit {
  title: string;
  url: string;
  snippet: string;
  domain: string;
  /** 结果来源，便于告知用户数据出处。 */
  source: 'bing-rss' | 'sogou' | 'searxng';
}

export interface FreeSearchResult {
  query: string;
  hits: FreeSearchHit[];
  source: FreeSearchHit['source'];
  elapsedMs: number;
  /** 合规提示，UI 应展示。 */
  notice: string;
}

export type FreeSearchOutcome =
  | { ok: true; result: FreeSearchResult }
  | { ok: false; error: string };

/** 合规提示：Bing RSS 条款要求个人非商业用途。 */
export const BING_NOTICE = '搜索结果来自 Bing 公开 RSS，按其条款仅限个人非商业使用。';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

/** 极简 XML 取值：只处理 RSS 里出现的转义与 CDATA，不引第三方解析库。 */
function decodeXml(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/<[^>]+>/g, '')
    .trim();
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

/** 解析 Bing RSS。每个 <item> 有 title / link / description。 */
export function parseBingRss(xml: string, limit = 10): FreeSearchHit[] {
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  const out: FreeSearchHit[] = [];
  for (const raw of items) {
    const title = raw.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '';
    const link = raw.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? '';
    const desc = raw.match(/<description>([\s\S]*?)<\/description>/)?.[1] ?? '';
    const url = decodeXml(link);
    if (!url) continue;
    out.push({
      title: decodeXml(title).slice(0, 200),
      url,
      snippet: decodeXml(desc).slice(0, 400),
      domain: domainOf(url),
      source: 'bing-rss'
    });
    if (out.length >= limit) break;
  }
  return out;
}

/** 解析 Bing HTML 结果页的 <h2><a>。比 RSS 稳定，RSS 在长查询下会返回污染缓存。 */
export function parseBingHtml(html: string, limit = 10): FreeSearchHit[] {
  const out: FreeSearchHit[] = [];
  const re = /<h2><a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a><\/h2>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const url = decodeXml(m[1]);
    const title = decodeXml(m[2]);
    if (!url.startsWith('http') || !title) continue;
    out.push({ title: title.slice(0, 200), url, snippet: '', domain: domainOf(url), source: 'bing-rss' });
    if (out.length >= limit) break;
  }
  return out;
}

/** 解析搜狗结果页。链接是 /link?url= 形式，保留原样交给调用方决定是否跟随。 */
export function parseSogouHtml(html: string, limit = 10): FreeSearchHit[] {
  const out: FreeSearchHit[] = [];
  const blocks = html.split(/<h3[^>]*class="vr-title[^"]*"[^>]*>/).slice(1);
  for (const block of blocks) {
    const href = block.match(/href="([^"]+)"/)?.[1] ?? '';
    const titleRaw = block.slice(0, block.indexOf('</h3>') > 0 ? block.indexOf('</h3>') : 200);
    const title = decodeXml(titleRaw.replace(/<!--[\s\S]*?-->/g, ''));
    if (!href || !title) continue;
    const url = href.startsWith('http') ? href : `https://www.sogou.com${href}`;
    out.push({ title: title.slice(0, 200), url, snippet: '', domain: domainOf(url), source: 'sogou' });
    if (out.length >= limit) break;
  }
  return out;
}

async function fetchWithTimeout(
  fetchImpl: FetchLike,
  url: string,
  timeoutMs: number,
  extraHeaders: Record<string, string> = {}
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, {
      method: 'GET',
      headers: { 'user-agent': UA, accept: '*/*', ...extraHeaders },
      signal: controller.signal
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 免费搜索：优先 Bing RSS，失败自动回落搜狗。
 * 两个都失败时返回明确错误，不返回空结果冒充成功。
 */
export interface FreeSearchOptions {
  fetchImpl: FetchLike;
  now?: () => number;
  limit?: number;
  timeoutMs?: number;
  /** 已知场合/身份，用于生成更精准的检索词。 */
  occasion?: string;
  identity?: string;
  /** 最多尝试几个改写后的查询，默认 2。每多试一次就多一次请求。 */
  maxAttempts?: number;
}

/**
 * 免费搜索：先改写查询，再按相关性筛选，避免把「首词词条」当结果。
 *
 * 实测结论（决定实现方式）：
 * - 口语疑问式查询（「份子钱一般给多少」）能命中经验贴
 * - 名词开头的长查询（「同事结婚随礼一般给多少」）会被降级成首词词条
 * 所以先用 query-plan 生成检索词，命中不相关就换下一个。
 */
export async function freeSearch(
  query: string,
  deps: FreeSearchOptions
): Promise<FreeSearchOutcome> {
  const q = String(query || '').trim();
  if (!q) return { ok: false, error: '搜索内容为空' };
  const now = deps.now ?? Date.now;
  const limit = Math.min(Math.max(deps.limit ?? 8, 1), 20);
  const timeout = deps.timeoutMs ?? 15_000;
  const maxAttempts = Math.min(Math.max(deps.maxAttempts ?? 2, 1), 3);
  const started = now();
  const errors: string[] = [];

  const plan = planQueries(q, { occasion: deps.occasion, identity: deps.identity });
  const attempts = plan.queries.slice(0, maxAttempts);

  for (const attempt of attempts) {
    // 1) Bing HTML（结构化程度够用，且中文长查询比 RSS 稳定）
    try {
      const url = `https://cn.bing.com/search?q=${encodeURIComponent(attempt)}`;
      const resp = await fetchWithTimeout(deps.fetchImpl, url, timeout, {
        accept: 'text/html,application/xhtml+xml'
      });
      if (resp.ok) {
        const html = await resp.text();
        const hits = parseBingHtml(html, limit);
        const titles = hits.map((h) => h.title);
        if (hits.length && !looksIrrelevant(attempt, titles)) {
          return {
            ok: true,
            result: {
              query: attempt,
              hits,
              source: 'bing-rss',
              elapsedMs: now() - started,
              notice: '搜索结果来自必应公开结果页，仅作参考；具体礼金请以当地习惯为准。'
            }
          };
        }
        errors.push(hits.length ? `「${attempt}」结果不相关` : `「${attempt}」无结果`);
      } else {
        errors.push(`「${attempt}」返回 ${resp.status}`);
      }
    } catch (e) {
      errors.push(`「${attempt}」不可用：${(e as Error).name === 'AbortError' ? '超时' : (e as Error).message}`);
    }

    // 2) 搜狗（中文意图理解更好，但有反爬，作为同轮备选）
    try {
      const url = `https://www.sogou.com/web?query=${encodeURIComponent(attempt)}`;
      const resp = await fetchWithTimeout(deps.fetchImpl, url, timeout);
      if (resp.ok) {
        const html = await resp.text();
        const hits = parseSogouHtml(html, limit);
        if (hits.length) {
          return {
            ok: true,
            result: {
              query: attempt,
              hits,
              source: 'sogou',
              elapsedMs: now() - started,
              notice: '搜索结果来自搜狗公开结果页；链接为跳转地址，需二次解析才能取到原文。'
            }
          };
        }
        errors.push('搜狗无结果（可能触发反爬）');
      }
    } catch {
      errors.push('搜狗不可用');
    }
  }

  return { ok: false, error: `免费搜索未获得可用结果：${errors.slice(0, 3).join('；')}` };
}

/**
 * 把搜索结果整理成可给模型阅读的文本。
 * 只保留标题、来源域名、摘要——不把整页正文塞进去，避免 prompt 爆炸。
 */
export function hitsToContext(hits: FreeSearchHit[]): string {
  if (!hits.length) return '';
  return hits
    .map((h, i) => `[${i + 1}] ${h.title}（${h.domain}）\n${h.snippet || '（无摘要）'}\n${h.url}`)
    .join('\n\n');
}
