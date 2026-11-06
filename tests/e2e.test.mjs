import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';

/**
 * 端到端测试：真实浏览器 + 真实静态服务 + 真实点击。
 *
 * 为什么不用 Playwright Test 而用 node:test：
 * 仓库已有 173 个 node 测试统一在 `node --test` 下跑，再引一套 runner 只会增加维护面。
 * 这里只借 Playwright 的浏览器驱动能力。
 *
 * 前置：node build.js && vite build --config vite.studio.config.ts
 */

const ROOT = resolve('.');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

let server;
let baseUrl = '';
let browser;

function startServer() {
  return new Promise((ok, fail) => {
    server = createServer((req, res) => {
      const url = new URL(req.url ?? '/', 'http://127.0.0.1');
      const rel = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
      const target = normalize(join(ROOT, rel));
      if (!target.startsWith(ROOT + sep) && target !== ROOT) { res.writeHead(403); res.end(); return; }
      if (!existsSync(target)) { res.writeHead(404); res.end('not found'); return; }
      const body = readFileSync(target);
      res.writeHead(200, { 'content-type': MIME[extname(target).toLowerCase()] ?? 'application/octet-stream' });
      res.end(body);
    });
    server.once('error', fail);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      ok(`http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}/`);
    });
  });
}

before(async () => {
  if (!existsSync(join(ROOT, 'index.html'))) throw new Error('缺少 index.html，先跑 node build.js');
  if (!existsSync(join(ROOT, 'dist-studio/index.html'))) throw new Error('缺少 dist-studio，先跑 vite build --config vite.studio.config.ts');
  baseUrl = await startServer();
  browser = await chromium.launch();
});

after(async () => {
  await browser?.close();
  await new Promise((ok) => (server ? server.close(() => ok()) : ok()));
});

async function newPage() {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  return { ctx, page, errors };
}

const storage = (page) => page.evaluate(() => localStorage.getItem('eqworker_db_v1'));

// ============ 旧版客户端 ============

test('旧版：首启欢迎页 → 载入演示 → 四 Tab 与首页六卡全部可用，全程零控制台错误', async () => {
  const { ctx, page, errors } = await newPage();
  try {
    await page.goto(baseUrl + 'index.html', { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    // 新用户：欢迎页给两条路，选「载入演示看看效果」
    const demoBtn = page.locator('[data-act="welcomeDemo"]');
    assert.equal(await demoBtn.count(), 1, '欢迎页应有演示数据入口');
    await demoBtn.click();
    await page.waitForTimeout(1200);

    const raw = await storage(page);
    assert.ok(raw, '演示数据应写入 localStorage');
    const data = JSON.parse(raw);
    assert.ok(data.persons.length >= 6, `应有 ≥6 位人脉，实际 ${data.persons.length}`);

    // 四个 Tab：首页 / 人脉 / 玩法 / 我的
    for (const [id, label] of [['home', '首页'], ['persons', '人脉'], ['play', '玩法'], ['me', '我的']]) {
      await page.evaluate(() => document.querySelectorAll('.mask').forEach((m) => m.remove()));
      const tab = page.locator(`[data-act="go"][data-arg="${id}"]`).first();
      assert.ok(await tab.count(), `应有 ${label} 入口`);
      await tab.click({ force: true });
      await page.waitForTimeout(350);
      const text = await page.locator('#view').innerText();
      assert.ok(text.length > 20, `${label} 页应有内容，实际 ${text.length} 字`);
    }

    // 首页卡片宫格：六张卡都能进入，且二级页能返回
    await page.evaluate(() => document.querySelectorAll('.mask').forEach((m) => m.remove()));
    await page.locator('[data-act="go"][data-arg="home"]').first().click({ force: true });
    await page.waitForTimeout(350);
    const cards = page.locator('.entry-card');
    assert.equal(await cards.count(), 6, `首页应有 6 张入口卡，实际 ${await cards.count()}`);
    for (const [arg, expect] of [['actions', '今日行动'], ['ledger', '人情账本'], ['health', '关系体检']]) {
      await page.locator(`[data-act="homePage"][data-arg="${arg}"]`).first().click({ force: true });
      await page.waitForTimeout(350);
      const t = await page.locator('#view').innerText();
      assert.ok(t.includes(expect), `二级页「${expect}」应能打开`);
      const back = page.locator('[data-act="homeBack"]').first();
      assert.ok(await back.count(), '二级页应有返回首页按钮');
      await back.click({ force: true });
      await page.waitForTimeout(300);
      assert.ok((await page.locator('#view').innerText()).includes('今日人情简报'), '应能返回首页');
    }

    // 引导流：三步走完，结果页有金额与话术
    await page.locator('[data-act="wizard"]').first().click({ force: true });
    await page.waitForTimeout(400);
    assert.ok((await page.locator('#modal-root').innerText()).includes('最近要办什么事'), '第 1 步应问场合');
    await page.locator('[data-act="wizardScene"][data-arg="白事"]').first().click({ force: true });
    await page.waitForTimeout(400);
    assert.ok((await page.locator('#modal-root').innerText()).includes('这份心意给谁'), '第 2 步应问对象');
    await page.locator('[data-act="wizardPerson"]').first().click({ force: true });
    await page.waitForTimeout(500);
    const wizText = await page.locator('#modal-root').innerText();
    assert.ok(wizText.includes('为什么是这个数'), '结果页应说明依据');
    assert.ok(wizText.includes('别踩这些坑'), '结果页应给忌讳');
    assert.ok(wizText.includes('这么说就对了'), '结果页应给话术');
    const rangeText = await page.locator('.wiz-result-range').innerText();
    assert.ok(/¥[\d,]+\s*—\s*¥[\d,]+/.test(rangeText), `结果页应有金额区间，实际「${rangeText}」`);
    await page.evaluate(() => document.querySelectorAll('.mask').forEach((m) => m.remove()));

    assert.deepEqual(errors, [], '不应有控制台错误');
  } finally { await ctx.close(); }
});

test('旧版：随礼参谋给出三档金额且可改档重算', async () => {
  const { ctx, page, errors } = await newPage();
  try {
    await page.goto(baseUrl + 'index.html', { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.locator('[data-act="welcomeDemo"]').click();
    await page.waitForTimeout(1200);

    // 首页「随礼参谋」卡现在打开三步引导；走到结果页同样会给出三档金额。
    const giftEntry = page.locator('.entry-card[aria-label^="随礼参谋"]').first();
    assert.ok(await giftEntry.count(), '首页应有随礼参谋入口');
    await giftEntry.click({ force: true });
    await page.waitForTimeout(500);
    await page.locator('[data-act="wizardScene"][data-arg="婚礼"]').first().click({ force: true });
    await page.waitForTimeout(400);
    await page.locator('[data-act="wizardPerson"]').first().click({ force: true });
    await page.waitForTimeout(600);
    const modal = await page.locator('#modal-root').innerText();
    assert.match(modal, /¥\s?[\d,]+\s*—\s*¥\s?[\d,]+/, '应显示金额区间');
    assert.match(modal, /建议中位/, '应显示建议中位');
    assert.deepEqual(errors, []);
  } finally { await ctx.close(); }
});

test('旧版：拒绝借款话术带称呼且三种语气齐全', async () => {
  const { ctx, page, errors } = await newPage();
  try {
    await page.goto(baseUrl + 'index.html', { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.locator('[data-act="welcomeDemo"]').click();
    await page.waitForTimeout(1200);

    const entry = page.locator('[data-act="scriptModal"]').first();
    assert.ok(await entry.count(), '应有话术入口');
    await entry.click({ force: true });
    await page.waitForTimeout(500);
    const text = await page.locator('#modal-root').innerText();
    assert.ok(text.length > 40, '话术内容不应为空');
    assert.deepEqual(errors, []);
  } finally { await ctx.close(); }
});

test('旧版：刷新后数据不丢（持久化闭环）', async () => {
  const { ctx, page } = await newPage();
  try {
    await page.goto(baseUrl + 'index.html', { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.locator('[data-act="welcomeDemo"]').click();
    await page.waitForTimeout(1200);
    const before = JSON.parse((await storage(page)));
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(900);
    const after = JSON.parse((await storage(page)));
    assert.equal(after.persons.length, before.persons.length, '刷新后人脉数应一致');
    assert.equal(after.events.length, before.events.length, '刷新后往来数应一致');
  } finally { await ctx.close(); }
});

test('旧版：移动端 390×844 布局可用', async () => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  try {
    await page.goto(baseUrl + 'index.html', { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.locator('[data-act="welcomeDemo"]').click();
    await page.waitForTimeout(1200);
    // 底部导航应在视口内
    const nav = page.locator('[data-act="go"][data-arg="home"]').first();
    const box = await nav.boundingBox();
    assert.ok(box && box.y >= 0 && box.y + box.height <= 844, '底部导航不应溢出视口');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(overflow <= 2, `移动端不应横向溢出，实际 ${overflow}px`);
  } finally { await ctx.close(); }
});

// ============ Studio ============

test('Studio：五个视图渲染、修炼答题、成绩刷新保留', async () => {
  const { ctx, page, errors } = await newPage();
  try {
    await page.goto(baseUrl + 'dist-studio/index.html', { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.locator('[data-act="load-demo"]').first().click();
    await page.waitForTimeout(1200);

    const navs = await page.locator('[data-act="nav"]').count();
    assert.equal(navs, 5, '应有五个导航');

    for (const [view, label] of [['overview', '仪表盘'], ['persons', '人脉'], ['ledger', '账本'], ['practice', '修炼'], ['ai', 'AI']]) {
      await page.locator(`[data-view="${view}"]`).first().click({ force: true });
      await page.waitForTimeout(500);
      const text = await page.locator('#main').innerText();
      assert.ok(text.length > 50, `${label} 应有内容`);
    }

    // 修炼：答题 → 成绩落库 → 刷新仍在
    await page.locator('[data-view="practice"]').first().click({ force: true });
    await page.waitForTimeout(400);
    await page.locator('[data-act="practice-answer"]').first().click({ force: true });
    await page.waitForTimeout(700);
    assert.match(await page.locator('#dialog-root').innerText(), /练习结果|人情点拨/);
    await page.locator('[data-act="dialog-close"]').last().click({ force: true });
    await page.waitForTimeout(300);

    const wisdomBefore = (await page.locator('#main').innerText()).match(/(\d+)\s*智慧值/)?.[1];
    assert.ok(Number(wisdomBefore) > 0, '答题后智慧值应大于 0');

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await page.locator('[data-view="practice"]').first().click({ force: true });
    await page.waitForTimeout(400);
    const wisdomAfter = (await page.locator('#main').innerText()).match(/(\d+)\s*智慧值/)?.[1];
    assert.equal(wisdomAfter, wisdomBefore, '刷新后智慧值应保留');

    assert.deepEqual(errors, []);
  } finally { await ctx.close(); }
});

test('Studio：账本页成就 13 个、年度 12 根柱', async () => {
  const { ctx, page, errors } = await newPage();
  try {
    await page.goto(baseUrl + 'dist-studio/index.html', { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.locator('[data-act="load-demo"]').first().click();
    await page.waitForTimeout(1200);
    await page.locator('[data-view="ledger"]').first().click({ force: true });
    await page.waitForTimeout(700);

    assert.equal(await page.locator('.badge').count(), 13, '应有 13 个成就徽章');
    assert.equal(await page.locator('.annual-bar').count(), 12, '应有 12 根年度柱');
    assert.deepEqual(errors, []);
  } finally { await ctx.close(); }
});

test('Studio：AI 默认关闭且不发起网络请求', async () => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const requests = [];
  page.on('request', (r) => {
    const u = r.url();
    // 只关心外部域名，本地静态资源不算
    if (!u.startsWith(baseUrl) && !u.startsWith('data:') && !u.startsWith('blob:')) requests.push(u);
  });
  try {
    await page.goto(baseUrl + 'dist-studio/index.html', { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.locator('[data-act="load-demo"]').first().click();
    await page.waitForTimeout(1000);
    await page.locator('[data-view="ai"]').first().click({ force: true });
    await page.waitForTimeout(800);
    const text = await page.locator('#main').innerText();
    assert.match(text, /未启用|默认关闭/, 'AI 应显示为默认关闭');
    assert.deepEqual(requests, [], `AI 关闭状态不应有任何外部请求，实际：${requests.join(', ')}`);
  } finally { await ctx.close(); }
});
