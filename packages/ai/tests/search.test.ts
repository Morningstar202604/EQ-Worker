import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SEARCH_SETTINGS,
  builtinSearchTool,
  searchWeb,
  validateSearchSettings,
  willUseNetwork
} from '../src/search';
import type { FetchLike } from '../src/types';

function fakeFetch(payload: unknown, status = 200): { fn: FetchLike; calls: Array<{ url: string; body: unknown }> } {
  const calls: Array<{ url: string; body: unknown }> = [];
  const fn: FetchLike = async (url, init) => {
    calls.push({ url, body: init?.body ? JSON.parse(String(init.body)) : null });
    return {
      ok: status >= 200 && status < 300,
      status,
      async json() { return payload; },
      async text() { return JSON.stringify(payload); }
    } as unknown as Response;
  };
  return { fn, calls };
}

const EP = 'https://open.bigmodel.cn/api/paas/v4/web_search';

describe('默认关闭', () => {
  it('默认 backend 是 none', () => {
    expect(DEFAULT_SEARCH_SETTINGS.backend).toBe('none');
  });

  it('默认配置下 willUseNetwork 为 false', () => {
    expect(willUseNetwork(DEFAULT_SEARCH_SETTINGS)).toBe(false);
    expect(willUseNetwork(null)).toBe(false);
    expect(willUseNetwork(undefined)).toBe(false);
  });

  it('backend 非 none 时 willUseNetwork 为 true', () => {
    expect(willUseNetwork({ backend: 'endpoint', endpoint: EP })).toBe(true);
    expect(willUseNetwork({ backend: 'builtin' })).toBe(true);
  });

  it('未开启时直接返回错误，不发任何请求', async () => {
    const { fn, calls } = fakeFetch({});
    const r = await searchWeb('杭州 婚礼 随礼', DEFAULT_SEARCH_SETTINGS, { fetchImpl: fn });
    expect(r.ok).toBe(false);
    expect(calls.length).toBe(0);
  });
});

describe('配置校验', () => {
  it('backend=none 不报错', () => {
    expect(validateSearchSettings({ backend: 'none' })).toEqual([]);
  });

  it('endpoint 模式缺地址或 Key 时报错', () => {
    expect(validateSearchSettings({ backend: 'endpoint' }).length).toBeGreaterThan(0);
    expect(validateSearchSettings({ backend: 'endpoint', endpoint: EP }).length).toBeGreaterThan(0);
  });

  it('地址必须是 http(s)', () => {
    const errs = validateSearchSettings({ backend: 'endpoint', endpoint: 'ftp://x', apiKey: 'k' });
    expect(errs.join()).toContain('http');
  });

  it('条数必须在 1–20', () => {
    expect(validateSearchSettings({ backend: 'endpoint', endpoint: EP, apiKey: 'k', count: 0 }).length).toBeGreaterThan(0);
    expect(validateSearchSettings({ backend: 'endpoint', endpoint: EP, apiKey: 'k', count: 99 }).length).toBeGreaterThan(0);
    expect(validateSearchSettings({ backend: 'endpoint', endpoint: EP, apiKey: 'k', count: 5 })).toEqual([]);
  });

  it('builtin 模式不需要地址与 Key', () => {
    expect(validateSearchSettings({ backend: 'builtin' })).toEqual([]);
  });
});

describe('内置搜索工具声明', () => {
  it('生成智谱 GLM 的 web_search 工具格式', () => {
    const tool = builtinSearchTool(5) as Record<string, unknown>;
    expect(tool.type).toBe('web_search');
    const ws = tool.web_search as Record<string, unknown>;
    expect(ws.enable).toBe(true);
    expect(ws.search_result).toBe(true);
  });

  it('条数被转成字符串（智谱 Python SDK 要求）', () => {
    const ws = (builtinSearchTool(8) as Record<string, unknown>).web_search as Record<string, unknown>;
    expect(ws.count).toBe('8');
  });
});

describe('endpoint 搜索', () => {
  it('成功时解析智谱响应格式', async () => {
    const { fn, calls } = fakeFetch({
      search_result: [
        { title: '杭州随礼行情', link: 'https://example.com/hz', content: '同事婚礼一般 600-800' }
      ]
    });
    const r = await searchWeb('杭州 同事 婚礼 随礼', { backend: 'endpoint', endpoint: EP, apiKey: 'k', count: 5 }, { fetchImpl: fn });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.hits.length).toBe(1);
    expect(r.result.hits[0].domain).toBe('example.com');
    expect(calls.length).toBe(1);
    expect(calls[0].url).toBe(EP);
  });

  it('请求体带上 search_query 且截到 70 字', async () => {
    const { fn, calls } = fakeFetch({ search_result: [] });
    const long = 'x'.repeat(200);
    await searchWeb(long, { backend: 'endpoint', endpoint: EP, apiKey: 'k' }, { fetchImpl: fn });
    const body = calls[0].body as Record<string, unknown>;
    expect(String(body.search_query).length).toBeLessThanOrEqual(70);
  });

  it('兼容 SearXNG 风格的 results 数组', async () => {
    const { fn } = fakeFetch({
      results: [{ title: 'a', url: 'https://a.com/x', content: '摘要' }]
    });
    const r = await searchWeb('q', { backend: 'endpoint', endpoint: EP, apiKey: 'k' }, { fetchImpl: fn });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.hits[0].url).toBe('https://a.com/x');
  });

  it('HTTP 非 2xx 时返回错误而不是空结果', async () => {
    const { fn } = fakeFetch({}, 500);
    const r = await searchWeb('q', { backend: 'endpoint', endpoint: EP, apiKey: 'k' }, { fetchImpl: fn });
    expect(r.ok).toBe(false);
  });

  it('网络异常返回错误，不抛异常', async () => {
    const fn: FetchLike = async () => { throw new Error('network down'); };
    const r = await searchWeb('q', { backend: 'endpoint', endpoint: EP, apiKey: 'k' }, { fetchImpl: fn });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toContain('network down');
  });

  it('空查询直接拒绝，不发请求', async () => {
    const { fn, calls } = fakeFetch({});
    const r = await searchWeb('   ', { backend: 'endpoint', endpoint: EP, apiKey: 'k' }, { fetchImpl: fn });
    expect(r.ok).toBe(false);
    expect(calls.length).toBe(0);
  });

  it('builtin 模式不在本地发请求（避免重复计费）', async () => {
    const { fn, calls } = fakeFetch({});
    const r = await searchWeb('q', { backend: 'builtin' }, { fetchImpl: fn });
    expect(r.ok).toBe(false);
    expect(calls.length).toBe(0);
  });

  it('结果条数不超过 count', async () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ title: `t${i}`, link: `https://e.com/${i}`, content: 'c' }));
    const { fn } = fakeFetch({ search_result: many });
    const r = await searchWeb('q', { backend: 'endpoint', endpoint: EP, apiKey: 'k', count: 5 }, { fetchImpl: fn });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.hits.length).toBeLessThanOrEqual(20);
  });
});
