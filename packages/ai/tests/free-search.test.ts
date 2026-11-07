import { describe, expect, it } from 'vitest';
import { detectContext, looksIrrelevant, planQueries } from '../src/query-plan';
import { freeSearch, hitsToContext, parseBingHtml, parseBingRss, parseSogouHtml } from '../src/free-search';
import type { FetchLike } from '../src/types';

describe('查询改写', () => {
  it('识别场合同义词', () => {
    expect(detectContext('同事结婚该随多少').occasion).toBe('婚礼');
    expect(detectContext('家里老人过世了').occasion).toBe('白事');
    expect(detectContext('朋友住院了').occasion).toBe('探病');
    expect(detectContext('孩子考上大学').occasion).toBe('升学');
  });

  it('识别身份', () => {
    expect(detectContext('给领导送礼').identity).toBe('领导');
    expect(detectContext('客户那边怎么处理').identity).toBe('客户');
  });

  it('婚礼场景生成口语疑问式查询', () => {
    const p = planQueries('同事结婚我该随多少', { occasion: '婚礼', identity: '同事' });
    expect(p.queries.some((q) => q.includes('多少'))).toBe(true);
  });

  it('查询数量被限制在 3 条以内', () => {
    const p = planQueries('同事结婚随礼', { occasion: '婚礼', identity: '同事' });
    expect(p.queries.length).toBeLessThanOrEqual(3);
    expect(p.queries.length).toBeGreaterThan(0);
  });

  it('原始意图作为兜底保留', () => {
    const p = planQueries('一个很奇怪的问法');
    expect(p.queries).toContain('一个很奇怪的问法');
  });

  it('空意图也能产出可用查询', () => {
    const p = planQueries('');
    expect(p.queries.length).toBeGreaterThan(0);
  });
});

describe('相关性判定', () => {
  it('百科词条结果判定为不相关', () => {
    expect(looksIrrelevant('同事结婚随多少', ['同事（汉语词语）_百度百科', '同事_汉典'])).toBe(true);
  });

  it('含意图词的真实结果判定为相关', () => {
    expect(looksIrrelevant('份子钱一般给多少', ['份子钱一般给多少？全国各地统计', '结婚随礼给多少合适'])).toBe(false);
  });

  it('空结果判定为不相关', () => {
    expect(looksIrrelevant('x', [])).toBe(true);
  });

  /* 回归：真实必应结果里常夹 1-2 条百科，好结果标题用的是同义词而不是查询原词。
     早前判据过严，把「探病也有讲究」「探病礼仪」全判成不相关，导致 3/3 搜索失败。 */
  it('夹杂百科但多数结果相关时，判为相关', () => {
    const titles = [
      '探病（汉语词语）_百度百科',
      '三六九不看病人？探病也有讲究，这些最好要了解！',
      '探病礼仪_百度百科',
      '“上午不借钱，下午不探病”，探望病人有讲究',
      '探病是什么意思？一文讲清含义、礼仪与禁忌'
    ];
    expect(looksIrrelevant('探病送什么好', titles)).toBe(false);
  });

  it('绝大多数是百科词条时才判为不相关', () => {
    const titles = [
      '同事（汉语词语）_百度百科',
      '同事_汉典',
      '同事的拼音_组词',
      'colleague - 百度百科'
    ];
    expect(looksIrrelevant('同事结婚随多少', titles)).toBe(true);
  });

  it('完全跑题判定为不相关', () => {
    expect(looksIrrelevant('婚礼随礼', ['天气预报', '今日股市行情'])).toBe(true);
  });
});

describe('解析器', () => {
  it('解析 Bing RSS 的 item', () => {
    const xml = '<item><title>标题A</title><link>https://a.com/1</link><description>摘要A</description></item>';
    const hits = parseBingRss(xml);
    expect(hits.length).toBe(1);
    expect(hits[0].title).toBe('标题A');
    expect(hits[0].domain).toBe('a.com');
  });

  it('解析 Bing HTML 的 h2>a', () => {
    const html = '<h2><a href="https://b.com/x">标题B</a></h2>';
    const hits = parseBingHtml(html);
    expect(hits.length).toBe(1);
    expect(hits[0].url).toBe('https://b.com/x');
  });

  it('解析搜狗的 vr-title', () => {
    const html = '<h3 class="vr-title"><a href="/link?url=abc">同事结婚随多少</a></h3>';
    const hits = parseSogouHtml(html);
    expect(hits.length).toBe(1);
    expect(hits[0].title).toContain('同事结婚');
    expect(hits[0].url).toContain('sogou.com');
  });

  it('XML 实体被正确解码', () => {
    const xml = '<item><title>A &amp; B</title><link>https://a.com/1</link><description>x &lt; y</description></item>';
    const hits = parseBingRss(xml);
    expect(hits[0].title).toBe('A & B');
    expect(hits[0].snippet).toContain('<');
  });
});

describe('免费搜索主流程', () => {
  function fake(pages: Record<string, string>): FetchLike {
    return async (url) => {
      const key = Object.keys(pages).find((k) => url.includes(k));
      return {
        ok: !!key,
        status: key ? 200 : 404,
        async text() { return key ? pages[key] : ''; }
      } as unknown as Response;
    };
  }

  it('命中相关结果时返回', async () => {
    const fn = fake({
      'bing.com': '<h2><a href="https://x.com/a">份子钱一般给多少？统计</a></h2>'
    });
    const r = await freeSearch('份子钱一般给多少', { fetchImpl: fn, occasion: '婚礼' });
    expect(r.ok).toBe(true);
  });

  it('全部失败时返回错误而不是空结果', async () => {
    const r = await freeSearch('随便什么', { fetchImpl: async () => ({ ok: false, status: 500, text: async () => '' } as unknown as Response) });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toContain('未获得可用结果');
  });

  it('空查询直接拒绝', async () => {
    let called = 0;
    const fn: FetchLike = async () => { called++; return { ok: true, status: 200, text: async () => '' } as unknown as Response; };
    const r = await freeSearch('  ', { fetchImpl: fn });
    expect(r.ok).toBe(false);
    expect(called).toBe(0);
  });

  it('尝试次数受 maxAttempts 限制', async () => {
    let calls = 0;
    const fn: FetchLike = async () => {
      calls++;
      return { ok: true, status: 200, text: async () => '<html></html>' } as unknown as Response;
    };
    await freeSearch('同事结婚随多少', { fetchImpl: fn, occasion: '婚礼', identity: '同事', maxAttempts: 1 });
    // 1 轮 = 最多 Bing + 搜狗 两次
    expect(calls).toBeLessThanOrEqual(2);
  });
});

describe('结果转上下文', () => {
  it('按编号输出标题/域名/摘要/链接', () => {
    const text = hitsToContext([
      { title: 'T1', url: 'https://a.com/1', snippet: 'S1', domain: 'a.com', source: 'bing-rss' }
    ]);
    expect(text).toContain('[1]');
    expect(text).toContain('T1');
    expect(text).toContain('a.com');
    expect(text).toContain('https://a.com/1');
  });

  it('空结果返回空串', () => {
    expect(hitsToContext([])).toBe('');
  });
});
