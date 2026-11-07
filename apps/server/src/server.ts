/**
 * EQ-Worker 本地服务端（Web 后台）。
 *
 * 定位：给「已经有数据、想在电脑上看得更全」的人一个管理界面——
 * 不引入账号体系、不联网、只在 127.0.0.1 上跑。
 *
 * 安全边界（这些不是可选装饰，是设计前提）：
 * - 只绑定回环地址。即便误开在公网机器上，外部也连不进来。
 * - 除读静态资源外，全部 API 需要 Bearer 令牌；令牌首次启动自动生成，
 *   打印在控制台，也可用 EQWORKER_TOKEN 指定。
 * - 不提供删除全部数据的高危接口；清空数据只能在客户端手动操作。
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { extname, join, resolve, normalize, sep } from 'node:path';
import { createFileStore } from '../../../packages/node/src/index';
import { resolveDataFile } from '../../../packages/node/src/index';
import {
  overallMetrics,
  buildActions,
  buildAlerts,
  healthRanking,
  ledgerTotals,
  ledgerInsights,
  personLedger,
  ledgerNetLabel,
  computePerson,
  achievements,
  annualReport,
  monthInsights,
  giftAdvice,
  buildScripts,
  SCRIPT_SCENES,
  EVENT_TYPES,
  OCCASIONS,
  upcomingDates,
  uid,
  sanitizeImport,
  type AppState,
  type EventType
} from '../../../packages/core/src/index';

interface ServerOptions {
  port?: number;
  host?: string;
  dataFile?: string;
  /** 静态资源目录；未指定时只提供 API。 */
  staticDir?: string;
  token?: string;
  quiet?: boolean;
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8'
};

function json(res: ServerResponse, code: number, body: unknown): void {
  const text = JSON.stringify(body);
  res.writeHead(code, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(text),
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff'
  });
  res.end(text);
}

function readBody(req: IncomingMessage, limit = 5 * 1024 * 1024): Promise<string> {
  return new Promise((ok, fail) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > limit) { fail(new Error('请求体过大')); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on('end', () => ok(Buffer.concat(chunks).toString('utf8')));
    req.on('error', fail);
  });
}

function tokenEquals(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/** 把人物相关的一组计算打包，避免前端多次请求各算一遍。 */
function personView(state: AppState, id: string) {
  const p = state.persons.find((x) => x.id === id);
  if (!p) return null;
  return {
    person: p,
    computed: computePerson(state, p),
    ledger: personLedger(state, id),
    events: state.events
      .filter((e) => e.personId === id)
      .sort((a, b) => b.time - a.time)
      .map((e) => ({ ...e, typeLabel: EVENT_TYPES[e.type]?.label ?? e.type, dateText: new Date(e.time).toISOString().slice(0, 10) }))
  };
}

export function createAppServer(options: ServerOptions = {}) {
  const host = options.host ?? '127.0.0.1';
  const port = options.port ?? 4317;
  const dataFile = options.dataFile ?? resolveDataFile();
  const token = options.token ?? process.env.EQWORKER_TOKEN ?? randomBytes(24).toString('hex');
  const staticDir = options.staticDir ? resolve(options.staticDir) : null;
  let store: ReturnType<typeof createFileStore>;

  const getStore = (): ReturnType<typeof createFileStore> => {
    // 每次请求懒创建：单进程多请求共享同一个商店实例即可，写后立即可读。
    if (!store) store = createFileStore(dataFile);
    return store;
  };

  const authed = (req: IncomingMessage): boolean => {
    const header = req.headers.authorization ?? '';
    const m = /^Bearer\s+(.+)$/i.exec(header);
    if (!m) return false;
    return tokenEquals(m[1].trim(), token);
  };

  const serveStatic = (req: IncomingMessage, res: ServerResponse, pathname: string): boolean => {
    if (!staticDir) return false;
    // 目录穿越防护：解析后必须仍在 staticDir 内
    const rel = decodeURIComponent(pathname === '/' ? '/index.html' : pathname);
    const target = normalize(join(staticDir, rel));
    if (!target.startsWith(staticDir + sep) && target !== staticDir) return false;
    if (!existsSync(target) || !statSync(target).isFile()) return false;
    const ext = extname(target).toLowerCase();
    const body = readFileSync(target);
    res.writeHead(200, {
      'content-type': MIME[ext] ?? 'application/octet-stream',
      'content-length': body.length,
      'x-content-type-options': 'nosniff'
    });
    res.end(body);
    return true;
  };

  const handleApi = async (req: IncomingMessage, res: ServerResponse, url: URL): Promise<void> => {
    const path = url.pathname.replace(/^\/api/, '');
    const s = getStore();

    // 健康检查不需要令牌：让 CLI/脚本能探活
    if (path === '/health') {
      json(res, 200, { ok: true, version: '3.9.0', dataFile });
      return;
    }
    if (!authed(req)) {
      json(res, 401, { error: '需要 Authorization: Bearer <token>' });
      return;
    }

    // ---------- 读 ----------
    if (req.method === 'GET' && path === '/overview') {
      const state = s.getState();
      json(res, 200, {
        metrics: overallMetrics(state),
        totals: ledgerTotals(state),
        insights: ledgerInsights(state),
        actions: buildActions(state, 8),
        alerts: buildAlerts(state),
        achievements: achievements(state),
        annual: annualReport(state),
        month: monthInsights(state),
        upcoming: upcomingDates(state, 45),
        counts: { persons: state.persons.length, events: state.events.length }
      });
      return;
    }
    if (req.method === 'GET' && path === '/persons') {
      const state = s.getState();
      json(res, 200, {
        persons: state.persons.map((p) => {
          const c = computePerson(state, p);
          const l = personLedger(state, p.id);
          return {
            id: p.id, name: p.name, identity: p.identity, tags: p.tags, note: p.note,
            birthday: p.birthday,
            heat: c.heat, trust: c.trust, intimacy: c.intimacy, activity: c.activity, debt: c.debt,
            lastDays: c.lastDays, eventCount: c.eventCount,
            net: l.net, netLabel: ledgerNetLabel(l.net), given: l.given, received: l.received
          };
        })
      });
      return;
    }
    const personMatch = /^\/persons\/([^/]+)$/.exec(path);
    if (req.method === 'GET' && personMatch) {
      const view = personView(s.getState(), decodeURIComponent(personMatch[1]));
      if (!view) { json(res, 404, { error: '找不到该人脉' }); return; }
      json(res, 200, view);
      return;
    }
    if (req.method === 'GET' && path === '/ledger') {
      const state = s.getState();
      json(res, 200, {
        totals: ledgerTotals(state),
        insights: ledgerInsights(state),
        rows: state.persons.map((p) => {
          const l = personLedger(state, p.id);
          return { id: p.id, name: p.name, given: l.given, received: l.received, net: l.net, netLabel: ledgerNetLabel(l.net) };
        })
      });
      return;
    }
    if (req.method === 'GET' && path === '/health-ranking') {
      json(res, 200, { ranking: healthRanking(s.getState()).map((r) => ({ id: r.p.id, name: r.p.name, ...r.h })) });
      return;
    }
    if (req.method === 'GET' && path === '/meta') {
      json(res, 200, {
        eventTypes: Object.entries(EVENT_TYPES).map(([id, m]) => ({ id, label: m.label })),
        occasions: OCCASIONS,
        scenes: SCRIPT_SCENES.map((x) => ({ id: x.id, label: x.label, hint: x.hint })),
        dataFile
      });
      return;
    }
    if (req.method === 'GET' && path === '/export') {
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'content-disposition': 'attachment; filename="eq-worker-backup.json"', 'cache-control': 'no-store' });
      res.end(s.exportJSON());
      return;
    }

    // ---------- 写 ----------
    if (req.method === 'POST' && (path === '/persons' || path === '/events')) {
      let body: Record<string, unknown>;
      try {
        body = JSON.parse(await readBody(req)) as Record<string, unknown>;
      } catch {
        json(res, 400, { error: '请求体不是合法 JSON' });
        return;
      }
      const state = s.getState();
      if (path === '/persons') {
        const name = String(body.name ?? '').trim().slice(0, 40);
        if (!name) { json(res, 400, { error: '姓名不能为空' }); return; }
        if (state.persons.some((p) => p.name === name)) { json(res, 409, { error: '同名联系人已存在' }); return; }
        const person = {
          id: uid(),
          name,
          identity: String(body.identity ?? '朋友').slice(0, 20),
          tags: Array.isArray(body.tags) ? body.tags.map((t) => String(t).slice(0, 20)).slice(0, 10) : [],
          birthday: String(body.birthday ?? '').slice(0, 10),
          anniversary: String(body.anniversary ?? '').slice(0, 10),
          likes: String(body.likes ?? '').slice(0, 200),
          taboos: String(body.taboos ?? '').slice(0, 200),
          note: String(body.note ?? '').slice(0, 500),
          adjust: 0,
          createdAt: Date.now()
        };
        /* 失败必须回滚内存：以前 push 后 save 失败只报 500，
           内存里留着这条没落盘的人脉，读接口照样返回它，
           之后所有写操作都因「规范化失败」继续 500，直到重启。 */
        const beforePersons = state.persons;
        state.persons = [...state.persons, person];
        s.setState(state);
        if (!s.save()) {
          state.persons = beforePersons;
          s.setState(state);
          json(res, 500, { error: '保存失败：内容超出限制或存储不可写，未写入' });
          return;
        }
        json(res, 201, person);
        return;
      }
      // events
      const personId = String(body.personId ?? '');
      const type = String(body.type ?? 'meal') as EventType;
      if (!state.persons.some((p) => p.id === personId)) { json(res, 400, { error: '关联人脉不存在' }); return; }
      if (!EVENT_TYPES[type]) { json(res, 400, { error: `事件类型不支持：${type}` }); return; }
      const meta = EVENT_TYPES[type];
      const amount = Number(body.amount ?? 0);
      /* money 必须接受调用方给出的方向：借入是 in、借出是 out。
         之前一律置 none，保存时又被 fixDir 归一成 in，
         于是接口永远只能记「借钱进来」，借出功能在 HTTP 层不可用。 */
      const dirInput = String(body.dir ?? '');
      const dir: 'in' | 'out' | 'none' =
        type === 'gift_get' ? 'in'
        : type === 'gift_give' ? 'out'
        : type === 'money' && (dirInput === 'in' || dirInput === 'out') ? dirInput
        : 'none';
      const event = {
        id: uid(),
        personId,
        type,
        title: String(body.title ?? meta.label).slice(0, 80),
        time: body.date ? new Date(String(body.date)).getTime() : Date.now(),
        weight: Number.isFinite(Number(body.weight)) ? Number(body.weight) : meta.dHeat,
        note: String(body.note ?? '').slice(0, 500),
        amount: Number.isFinite(amount) && amount > 0 ? amount : 0,
        dir,
        occasion: String(body.occasion ?? '日常').slice(0, 20)
      };
      /* 非法日期（new Date('x') → NaN）会被清洗丢弃，进而 save 拒写。
         必须在写入前拦掉，否则内存里留下这条坏事件，进程后续所有写操作全 500。 */
      if (!Number.isFinite(event.time)) { json(res, 400, { error: '日期格式不正确' }); return; }
      const beforeEvents = state.events;
      const beforeLast = state.lastEventId;
      state.events = [event, ...state.events];
      state.lastEventId = event.id;
      s.setState(state);
      if (!s.save()) {
        state.events = beforeEvents;
        state.lastEventId = beforeLast;
        s.setState(state);
        json(res, 500, { error: '保存失败：内容超出限制或存储不可写，未写入' });
        return;
      }
      json(res, 201, event);
      return;
    }

    if (req.method === 'DELETE' && /^\/events\/[^/]+$/.test(path)) {
      const id = decodeURIComponent(path.split('/').pop() as string);
      const state = s.getState();
      const before = state.events.length;
      state.events = state.events.filter((e) => e.id !== id);
      if (state.events.length === before) { json(res, 404, { error: '记录不存在' }); return; }
      s.setState(state);
      if (!s.save()) { json(res, 500, { error: '保存失败' }); return; }
      json(res, 200, { ok: true });
      return;
    }

    if (req.method === 'POST' && path === '/import') {
      let raw: unknown;
      try {
        raw = JSON.parse(await readBody(req, 20 * 1024 * 1024));
      } catch {
        json(res, 400, { error: '请求体不是合法 JSON' });
        return;
      }
      if (body_isExportWrapper(raw)) raw = (raw as { data?: unknown }).data;
      const clean = sanitizeImport(raw as Parameters<typeof sanitizeImport>[0]);
      /* 必须是「没有联系人」就拒绝，不能只看 persons+events 都为空：
         一份只有事件的备份会把现有联系人清空，只留一堆指向 ghost 的孤儿事件。 */
      if (!clean.persons.length) {
        json(res, 400, { error: '备份里没有可用的联系人，已拒绝导入（现有数据未改动）' });
        return;
      }
      /* applyImport 内部已负责落盘并在失败时回滚；不能再 save() 一次，
         否则回滚后第二次 save 会成功，接口报 200 但导入其实没发生。 */
      if (!s.applyImport(clean)) { json(res, 500, { error: '保存失败，未修改现有数据' }); return; }
      const st = s.getState();
      json(res, 200, { ok: true, persons: st.persons.length, events: st.events.length, warnings: clean.warn });
      return;
    }

    if (req.method === 'GET' && path === '/doctor') {
      const st = s.getState();
      const issues: string[] = [];
      const orphan = st.events.filter((e) => !st.persons.some((p) => p.id === e.personId));
      if (orphan.length) issues.push(`${orphan.length} 条往来指向不存在的联系人`);
      const seen = new Set<string>();
      for (const p of st.persons) {
        if (seen.has(p.id)) issues.push(`联系人 id 重复：${p.id}`);
        seen.add(p.id);
      }
      const badAmount = st.events.filter((e) => !Number.isFinite(Number(e.amount)) || Number(e.amount) < 0);
      if (badAmount.length) issues.push(`${badAmount.length} 条往来金额非法`);
      const badBirthday = st.persons.filter((p) => p.birthday && !/^\d{2}-\d{2}$/.test(p.birthday));
      if (badBirthday.length) issues.push(`${badBirthday.length} 位联系人生日格式非 MM-DD`);
      const future = st.events.filter((e) => e.time > Date.now() + 86400000);
      if (future.length) issues.push(`${future.length} 条往来时间在未来`);
      json(res, 200, {
        ok: issues.length === 0,
        issues,
        stats: { persons: st.persons.length, events: st.events.length, reminders: st.reminders.length },
        writeProtected: s.isWriteProtected(),
        dataFile
      });
      return;
    }

    if (req.method === 'GET' && path === '/gift') {
      const state = s.getState();
      const personId = url.searchParams.get('personId') ?? '';
      const occasion = url.searchParams.get('occasion') ?? '婚礼';
      const tier = (url.searchParams.get('tier') ?? 'standard') as 'simple' | 'standard' | 'generous';
      const city = (url.searchParams.get('city') ?? '二线') as '三线' | '二线' | '一线';
      json(res, 200, giftAdvice(state, personId, occasion, { tier, city }));
      return;
    }

    if (req.method === 'GET' && path === '/script') {
      const state = s.getState();
      const sceneId = url.searchParams.get('scene') ?? SCRIPT_SCENES[0].id;
      const personId = url.searchParams.get('personId') ?? '';
      json(res, 200, buildScripts(state, sceneId, personId, url.searchParams.get('context') ?? ''));
      return;
    }

    json(res, 404, { error: `未知接口 ${req.method} ${url.pathname}` });
  };

  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', `http://${host}:${port}`);
    // 只允许同源与本地：不设置开放式 CORS
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
    if (url.pathname.startsWith('/api/')) {
      handleApi(req, res, url).catch((e: Error) => {
        // 不把内部错误原文回给客户端：Node 的 fs 错误会带上绝对路径，
        // 而这类路径属于用户本机信息。详细栈只写进服务端日志。
        console.error('[server] 请求处理失败:', e);
        json(res, 500, { error: '服务器内部错误，详情见启动终端' });
      });
      return;
    }
    if (!serveStatic(req, res, url.pathname)) {
      json(res, 404, { error: 'not found' });
    }
  });

  return {
    server,
    token,
    dataFile,
    listen(): Promise<{ port: number; url: string }> {
      return new Promise((ok, fail) => {
        server.once('error', fail);
        server.listen(port, host, () => {
          const addr = server.address();
          const actual = typeof addr === 'object' && addr ? addr.port : port;
          ok({ port: actual, url: `http://${host}:${actual}/` });
        });
      });
    },
    close(): Promise<void> {
      return new Promise((ok) => server.close(() => ok()));
    }
  };
}

function body_isExportWrapper(raw: unknown): boolean {
  return !!raw && typeof raw === 'object' && 'app' in (raw as Record<string, unknown>) && 'data' in (raw as Record<string, unknown>);
}

// 直接运行时启动
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop() ?? '')) {
  const portArg = process.argv.find((a) => a.startsWith('--port='));
  const port = portArg ? Number(portArg.split('=')[1]) : Number(process.env.EQWORKER_PORT ?? 4317);
  const app = createAppServer({ port, staticDir: process.env.EQWORKER_STATIC ?? undefined });
  app.listen().then(({ url }) => {
    console.log(`EQ-Worker 后台已启动  ${url}`);
    console.log(`数据文件  ${app.dataFile}`);
    console.log(`访问令牌  ${app.token}`);
    console.log('');
    console.log('浏览器打开上面的地址，在页面里填入令牌即可。');
  }).catch((e: Error) => {
    console.error(`启动失败：${e.message}`);
    process.exitCode = 1;
  });
}
