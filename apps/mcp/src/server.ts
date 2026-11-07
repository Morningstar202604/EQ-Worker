/**
 * EQ-Worker MCP 服务器。
 *
 * 让 Claude Desktop / Cursor / Cline 等支持 MCP 的客户端直接读你的人情数据、
 * 算随礼、出话术。数据始终在本地文件里，MCP 不引入任何网络出站。
 *
 * 设计取舍：
 * - **只读工具默认可用**；写入工具（记一笔、加人脉）在注册时标 `readOnlyHint: false`，
 *   宿主会据此提示用户确认。这是 MCP 规范里的能力声明，不是我们自己发明的开关。
 * - **资源（resources）** 暴露人脉列表与单人详情，客户端可把它们当上下文引用，
 *   避免每次都调用工具。
 * - **提示（prompts）** 提供几个常用问法，降低宿主侧的配置成本。
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { createFileStore } from '../../../packages/node/src/index';
import { resolveDataFile } from '../../../packages/node/src/index';
import {
  EVENT_TYPES,
  OCCASIONS,
  SCRIPT_SCENES,
  buildActions,
  buildAlerts,
  buildScripts,
  computePerson,
  giftAdvice,
  healthRanking,
  ledgerInsights,
  ledgerNetLabel,
  ledgerTotals,
  personLedger,
  achievements,
  annualReport,
  monthInsights,
  overallMetrics,
  getWisdom,
  getLevel,
  upcomingDates,
  fmtMoney,
  fmtMoneyCN,
  uid,
  type AppState,
  type EventType
} from '../../../packages/core/src/index';

const VERSION = '3.9.0';
const file = resolveDataFile();
const store = createFileStore(file);
const state = (): AppState => store.getState();

const server = new McpServer(
  { name: 'eq-worker', version: VERSION },
  { instructions: 'EQ-Worker 是本地优先的人情世故助手。所有数据保存在用户本机，不会上传。回答时请引用真实数据，不要编造联系人姓名或金额。' }
);

const text = (s: string) => ({ content: [{ type: 'text' as const, text: s }] });
const json = (v: unknown) => text(JSON.stringify(v, null, 2));

// ---------------- 工具：读 ----------------

server.registerTool(
  'get_overview',
  {
    title: '人情总览',
    description: '获取人情指数、五维指标、账本汇总、今日行动、近期重要日子与成就进度。回答任何与「我的人际关系状况如何」相关的问题前先调用这个。',
    inputSchema: {},
    annotations: { readOnlyHint: true, openWorldHint: false }
  },
  async () => {
    const s = state();
    const m = overallMetrics(s);
    if (!m) return text('还没有任何联系人数据。用户需要先在 EQ-Worker 客户端里添加人脉。');
    const w = getWisdom(s);
    const lv = getLevel(w);
    return json({
      人情指数: m.index,
      五维指标: { 规模: m.scale, 热度: m.heatAvg, 频率: m.freq, 信用: m.credit, 智慧: m.wisdom },
      段位: { 名称: lv.cur.name, 智慧值: w, 说明: lv.cur.desc },
      账本: ledgerTotals(s),
      账本洞察: ledgerInsights(s),
      今日行动: buildActions(s, 8).map((a) => ({ 标题: a.title, 原因: a.reason })),
      提醒: buildAlerts(s).map((a) => a.text),
      近期日子: upcomingDates(s, 45),
      成就: achievements(s).filter((a) => a.done).map((a) => a.t),
      本月: monthInsights(s),
      年度: { 总笔数: annualReport(s).total, 关键词: annualReport(s).keywords }
    });
  }
);

server.registerTool(
  'list_persons',
  {
    title: '人脉列表',
    description: '列出所有联系人及其热度、信任、人情债、账本净额、最后往来时间。可按身份筛选。',
    inputSchema: {
      identity: z.string().optional().describe('按身份筛选，例如「领导」「朋友」'),
      sortBy: z.enum(['heat', 'debt', 'net', 'last']).optional().describe('排序字段：heat 热度、debt 人情债、net 账本净额、last 最后往来')
    },
    annotations: { readOnlyHint: true, openWorldHint: false }
  },
  async ({ identity, sortBy }) => {
    const s = state();
    // 空库也返回 {总数:0, 人脉:[]}：工具的输出结构必须稳定，
    // 否则宿主侧无法统一解析，用户会看到「解析失败」而不是「没有数据」。
    let rows = s.persons.map((p) => {
      const c = computePerson(s, p);
      const l = personLedger(s, p.id);
      return {
        id: p.id, 姓名: p.name, 身份: p.identity, 标签: p.tags,
        热度: Math.round(c.heat * 10) / 10, 信任: Math.round(c.trust * 10) / 10,
        亲密: Math.round(c.intimacy * 10) / 10, 人情债: Math.round(c.debt * 10) / 10,
        账本净额: l.net, 账本描述: ledgerNetLabel(l.net),
        最后往来天数: c.lastDays, 往来笔数: c.eventCount
      };
    });
    if (identity) rows = rows.filter((r) => r.身份 === identity);
    rows.sort((a, b) => {
      switch (sortBy) {
        case 'debt': return b.人情债 - a.人情债;
        case 'net': return Math.abs(b.账本净额) - Math.abs(a.账本净额);
        case 'last': return (a.最后往来天数 ?? 9999) - (b.最后往来天数 ?? 9999);
        default: return b.热度 - a.热度;
      }
    });
    return json({ 总数: rows.length, 人脉: rows });
  }
);

server.registerTool(
  'get_person',
  {
    title: '联系人详情',
    description: '获取单个联系人的完整画像：五维指标、账本明细、全部往来记录、健康度评分与建议。',
    inputSchema: { name: z.string().describe('联系人姓名或 id') },
    annotations: { readOnlyHint: true, openWorldHint: false }
  },
  async ({ name }) => {
    const s = state();
    const p = s.persons.find((x) => x.name === name || x.id === name);
    if (!p) return text(`找不到「${name}」。可以先调用 list_persons 查看有哪些人。`);
    const c = computePerson(s, p);
    const l = personLedger(s, p.id);
    const events = s.events.filter((e) => e.personId === p.id).sort((a, b) => b.time - a.time);
    const rank = healthRanking(s).find((r) => r.p.id === p.id);
    return json({
      基本信息: { 姓名: p.name, 身份: p.identity, 标签: p.tags, 生日: p.birthday, 纪念日: p.anniversary, 喜好: p.likes, 忌讳: p.taboos, 备注: p.note },
      指标: { 热度: c.heat, 信任: c.trust, 亲密: c.intimacy, 活跃度: c.activity, 人情债: c.debt, 最后往来天数: c.lastDays },
      账本: { 给出: l.given, 收到: l.received, 净额: l.net, 描述: ledgerNetLabel(l.net) },
      健康度: rank ? { 分数: rank.h.score, 状态: rank.h.level, 建议: rank.h.tips } : null,
      往来记录: events.map((e) => ({
        日期: new Date(e.time).toISOString().slice(0, 10),
        类型: EVENT_TYPES[e.type]?.label ?? e.type,
        标题: e.title,
        金额: e.amount || null,
        场合: e.occasion,
        备注: e.note || null
      }))
    });
  }
);

server.registerTool(
  'get_ledger',
  {
    title: '人情账本',
    description: '获取账本汇总、洞察与每人净额明细。回答「我欠谁钱」「随出去多少」这类问题时使用。',
    inputSchema: {},
    annotations: { readOnlyHint: true, openWorldHint: false }
  },
  async () => {
    const s = state();
    const totals = ledgerTotals(s);
    const insights = ledgerInsights(s);
    return json({
      汇总: { ...totals, 净额描述: ledgerNetLabel(totals.net) },
      洞察: insights,
      明细: s.persons
        .map((p) => {
          const l = personLedger(s, p.id);
          return { 姓名: p.name, 给出: l.given, 收到: l.received, 净额: l.net, 描述: ledgerNetLabel(l.net) };
        })
        .filter((r) => r.净额 !== 0)
        .sort((a, b) => Math.abs(b.净额) - Math.abs(a.净额))
    });
  }
);

server.registerTool(
  'get_health_ranking',
  {
    title: '关系体检',
    description: '按健康度从低到高排列所有关系，指出哪些关系最需要经营。',
    inputSchema: { limit: z.number().int().min(1).max(50).optional().describe('返回条数，默认全部') },
    annotations: { readOnlyHint: true, openWorldHint: false }
  },
  async ({ limit }) => {
    const ranking = healthRanking(state()).map((r) => ({
      姓名: r.p.name, 身份: r.p.identity, 健康度: r.h.score, 状态: r.h.level,
      账本: ledgerNetLabel(personLedger(state(), r.p.id).net),
      最后往来天数: computePerson(state(), r.p).lastDays
    }));
    return json(limit ? ranking.slice(0, limit) : ranking);
  }
);

server.registerTool(
  'advise_gift',
  {
    title: '随礼参谋',
    description: '根据关系、场合、档位和城市，给出从简/建议/重视三档礼金参考及计算依据。回答「该随多少礼」时使用。',
    inputSchema: {
      personName: z.string().optional().describe('给谁（姓名）。不填则按通用关系估算'),
      occasion: z.enum(OCCASIONS as unknown as [string, ...string[]]).describe(`场合，可选：${OCCASIONS.join('、')}`),
      tier: z.enum(['simple', 'standard', 'generous']).optional().describe('档位：simple 从简、standard 得体、generous 重视'),
      city: z.enum(['三线', '二线', '一线']).optional().describe('城市线级，影响地区系数')
    },
    annotations: { readOnlyHint: true, openWorldHint: false }
  },
  async ({ personName, occasion, tier, city }) => {
    const s = state();
    const p = personName ? s.persons.find((x) => x.name === personName || x.id === personName) : null;
    if (personName && !p) return text(`找不到「${personName}」。可以先调用 list_persons。`);
    const a = giftAdvice(s, p ? p.id : '', occasion, { tier, city });
    return json({
      对象: p ? p.name : '通用',
      场合: a.occasion,
      档位: a.tier,
      城市: a.city,
      金额: { 从简: a.low, 建议: a.mid, 重视: a.high, 显示: { 从简: fmtMoney(a.low), 建议: fmtMoney(a.mid), 重视: fmtMoney(a.high) }, 大写: { 建议: fmtMoneyCN(a.mid), 重视: fmtMoneyCN(a.high) } },
      计算依据: a.reasons,
      提示: a.note
    });
  }
);

server.registerTool(
  'write_script',
  {
    title: '话术参谋',
    description: `生成稳妥/亲近/简短三种语气的话术，覆盖 ${SCRIPT_SCENES.length} 个常见场景（破冰、道谢、道歉、请托、婉拒、拒绝借钱、催还、随礼、敬酒、探病、节日祝福等）。`,
    inputSchema: {
      scene: z.string().describe(`场景 id 或名称。可用：${SCRIPT_SCENES.map((s) => s.id).join(', ')}`),
      personName: z.string().optional().describe('对谁说（姓名），会带入称呼'),
      context: z.string().optional().describe('补充背景，例如「上次他帮我搬过家」')
    },
    annotations: { readOnlyHint: true, openWorldHint: false }
  },
  async ({ scene, personName, context }) => {
    const s = state();
    const sc = SCRIPT_SCENES.find((x) => x.id === scene || x.label === scene || x.label.includes(scene));
    if (!sc) return text(`场景不存在：${scene}。可用场景：${SCRIPT_SCENES.map((x) => `${x.id}（${x.label}）`).join('、')}`);
    const p = personName ? s.persons.find((x) => x.name === personName || x.id === personName) : null;
    const r = buildScripts(s, sc.id, p ? p.id : '', context ?? '');
    return json({
      场景: sc.label,
      说明: sc.hint,
      对象: p ? p.name : null,
      话术: r.variants.map((v) => ({ 语气: v.tone, 文本: v.text }))
    });
  }
);

server.registerTool(
  'get_achievements',
  {
    title: '成就进度',
    description: '列出所有成就徽章的达成情况与进度。',
    inputSchema: {},
    annotations: { readOnlyHint: true, openWorldHint: false }
  },
  async () => {
    const list = achievements(state());
    return json({
      已达成: list.filter((a) => a.done).length,
      总数: list.length,
      徽章: list.map((a) => ({ 名称: a.t, 描述: a.d, 进度: `${a.cur}/${a.need}`, 已达成: a.done }))
    });
  }
);

server.registerTool(
  'get_annual_report',
  {
    title: '年度回顾',
    description: '近 12 个月的往来趋势、最常走动的人、人情债与年度关键词。',
    inputSchema: {},
    annotations: { readOnlyHint: true, openWorldHint: false }
  },
  async () => json(annualReport(state()))
);

// ---------------- 工具：写 ----------------

server.registerTool(
  'record_event',
  {
    title: '记一笔往来',
    description: '记录一次人情往来。这是写操作，会修改用户的本地数据文件，调用前应向用户确认内容。',
    inputSchema: {
      personName: z.string().describe('关联联系人的姓名'),
      type: z.string().describe(`事件类型，可选：${Object.keys(EVENT_TYPES).join(', ')}`),
      title: z.string().describe('一句话描述，例如「请老张吃了顿烧烤」'),
      amount: z.number().min(0).optional().describe('金额（元），可选'),
      occasion: z.string().optional().describe(`场合，可选：${OCCASIONS.join(', ')}`),
      date: z.string().optional().describe('日期 ISO 格式如 2026-11-04，默认今天'),
      dir: z.enum(['in', 'out']).optional().describe('金额方向：in=我收到/借入，out=我给出/借出。借款类必填，否则无法入账'),
      note: z.string().optional().describe('备注')
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false }
  },
  async ({ personName, type, title, amount, occasion, date, dir, note }) => {
    const s = state();
    const p = s.persons.find((x) => x.name === personName || x.id === personName);
    if (!p) return text(`找不到「${personName}」。请先确认姓名，或用 add_person 添加。`);
    if (!EVENT_TYPES[type as EventType]) {
      return text(`事件类型不支持：${type}。可选：${Object.keys(EVENT_TYPES).join(', ')}`);
    }
    const meta = EVENT_TYPES[type as EventType];
    /* money 必须接受调用方给的方向；缺省 none（不猜），否则借出会被记成借入。 */
    const dirValue: 'in' | 'out' | 'none' =
      type === 'gift_get' ? 'in'
      : type === 'gift_give' ? 'out'
      : type === 'money' && (dir === 'in' || dir === 'out') ? dir
      : 'none';
    const event = {
      id: uid(),
      personId: p.id,
      type: type as EventType,
      title: title.slice(0, 80),
      time: date ? new Date(date).getTime() : Date.now(),
      weight: meta.dHeat,
      note: (note ?? '').slice(0, 500),
      amount: Number.isFinite(amount) && (amount ?? 0) > 0 ? (amount as number) : 0,
      dir: dirValue,
      occasion: occasion ?? '日常'
    };
    /* 先构造新数组、落盘失败则回滚引用：MCP 进程常驻，
       直接 push 后保存失败会把内存污染成「磁盘没有但接口看得到」的状态。 */
    const beforeEvents = s.events;
    s.events = [event, ...beforeEvents];
    s.lastEventId = event.id;
    store.setState(s);
    if (!store.save()) {
      s.events = beforeEvents;
      store.setState(s);
      return text('保存失败：数据文件不可写。用户的记录没有被修改。');
    }
    return json({ ok: true, 已记录: { 对象: p.name, 类型: meta.label, 标题: event.title, 金额: event.amount || null, 日期: new Date(event.time).toISOString().slice(0, 10) } });
  }
);

server.registerTool(
  'add_person',
  {
    title: '添加人脉',
    description: '添加一位新联系人。这是写操作，会修改用户的本地数据文件。',
    inputSchema: {
      name: z.string().min(1).max(40).describe('姓名'),
      identity: z.enum(['领导', '同事', '客户', '朋友', '家人', '长辈', '同学', '邻居', '其他']).optional().describe('身份'),
      tags: z.array(z.string()).optional().describe('标签'),
      birthday: z.string().optional().describe('生日，MM-DD 格式'),
      note: z.string().optional().describe('备注'),
      likes: z.string().optional().describe('喜好'),
      taboos: z.string().optional().describe('忌讳')
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false }
  },
  async ({ name, identity, tags, birthday, note, likes, taboos }) => {
    const s = state();
    if (s.persons.some((p) => p.name === name)) return text(`「${name}」已存在，未重复添加。`);
    const person = {
      id: uid(), name,
      identity: identity ?? '朋友',
      // 与核心规范（sanitize 的 10 个上限）一致：12 会让 save 的校验必拒，
      // 用户得到一条「存储不可写」的误导性报错。
      tags: (tags ?? []).slice(0, 10),
      birthday: birthday ?? '', anniversary: '',
      likes: likes ?? '', taboos: taboos ?? '', note: note ?? '',
      adjust: 0, createdAt: Date.now()
    };
    const beforePersons = s.persons;
    s.persons = [...beforePersons, person];
    store.setState(s);
    if (!store.save()) {
      s.persons = beforePersons;
      store.setState(s);
      return text('保存失败：数据文件不可写，未添加。');
    }
    return json({ ok: true, 已添加: person });
  }
);

// ---------------- 资源 ----------------

server.registerResource(
  'persons',
  'eqworker://persons',
  { title: '全部人脉', description: '当前所有联系人的列表与指标快照', mimeType: 'application/json' },
  async () => {
    const s = state();
    return {
      contents: [{
        uri: 'eqworker://persons',
        mimeType: 'application/json',
        text: JSON.stringify(s.persons.map((p) => {
          const c = computePerson(s, p);
          return { id: p.id, name: p.name, identity: p.identity, tags: p.tags, heat: Math.round(c.heat), debt: Math.round(c.debt) };
        }), null, 2)
      }]
    };
  }
);

server.registerResource(
  'ledger',
  'eqworker://ledger',
  { title: '人情账本', description: '账本汇总与每人净额', mimeType: 'application/json' },
  async () => {
    const s = state();
    return {
      contents: [{
        uri: 'eqworker://ledger',
        mimeType: 'application/json',
        text: JSON.stringify({
          totals: ledgerTotals(s),
          rows: s.persons.map((p) => {
            const l = personLedger(s, p.id);
            return { name: p.name, given: l.given, received: l.received, net: l.net };
          })
        }, null, 2)
      }]
    };
  }
);


server.registerTool(
  'search',
  {
    title: '搜索',
    description: '按关键词跨联系人姓名、标签、备注与往来标题搜索。用户问「关于 X 我记过什么」时使用。',
    inputSchema: { keyword: z.string().describe('关键词') },
    annotations: { readOnlyHint: true, openWorldHint: false }
  },
  async ({ keyword }) => {
    const s = state();
    const kw = keyword.toLowerCase();
    const persons = s.persons.filter((p) =>
      `${p.name} ${p.identity} ${(p.tags || []).join(' ')} ${p.note}`.toLowerCase().includes(kw)
    );
    const events = s.events
      .filter((e) => {
        const p = s.persons.find((x) => x.id === e.personId);
        return `${e.title} ${e.note} ${e.occasion} ${p ? p.name : ''}`.toLowerCase().includes(kw);
      })
      .map((e) => ({
        日期: new Date(e.time).toISOString().slice(0, 10),
        对象: s.persons.find((x) => x.id === e.personId)?.name ?? '',
        标题: e.title,
        金额: e.amount || null
      }));
    return json({ 关键词: keyword, 命中联系人: persons.map((p) => ({ 姓名: p.name, 身份: p.identity })), 命中往来: events });
  }
);

server.registerTool(
  'get_reminders',
  {
    title: '待办提醒',
    description: '列出待办提醒（谁、什么事、什么时候）。',
    inputSchema: {},
    annotations: { readOnlyHint: true, openWorldHint: false }
  },
  async () => {
    const s = state();
    return json(s.reminders.map((r) => ({
      id: r.id,
      对象: s.persons.find((p) => p.id === r.personId)?.name ?? '',
      内容: r.content,
      日期: r.date || null,
      状态: r.status === 'pending' ? '待办' : '已完成'
    })));
  }
);

server.registerTool(
  'add_reminder',
  {
    title: '添加待办',
    description: '给某位联系人添加一条待办提醒。写操作。',
    inputSchema: {
      personName: z.string().describe('关联联系人姓名'),
      content: z.string().describe('待办内容'),
      date: z.string().optional().describe('日期 YYYY-MM-DD，可选')
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false }
  },
  async ({ personName, content, date }) => {
    const s = state();
    const p = s.persons.find((x) => x.name === personName || x.id === personName);
    if (!p) return text(`找不到「${personName}」。`);
    const reminder = { id: uid(), personId: p.id, content: content.slice(0, 200), date: date ?? '', status: 'pending' as const };
    const beforeReminders = s.reminders;
    s.reminders = [...beforeReminders, reminder];
    store.setState(s);
    if (!store.save()) {
      s.reminders = beforeReminders;
      store.setState(s);
      return text('保存失败：数据文件不可写，未添加。');
    }
    return json({ ok: true, 已添加: reminder });
  }
);

server.registerTool(
  'get_practice_progress',
  {
    title: '修炼进度',
    description: '查看人情修炼场的段位、智慧值、已完成题目与连续天数。',
    inputSchema: {},
    annotations: { readOnlyHint: true, openWorldHint: false }
  },
  async () => {
    const s = state();
    const w = getWisdom(s);
    const lv = getLevel(w);
    return json({
      段位: lv.cur.name,
      段位说明: lv.cur.desc,
      智慧值: w,
      下一段位: lv.nxt ? { 名称: lv.nxt.name, 还差: Math.max(0, lv.nxt.min - w) } : null,
      连续修炼天数: s.streak.n,
      已练习题: Object.keys(s.progress).filter((k) => s.progress[k].times > 0).length,
      明细: s.progress
    });
  }
);

server.registerResource(
  'reminders',
  'eqworker://reminders',
  { title: '待办提醒', description: '当前待办与已完成提醒', mimeType: 'application/json' },
  async () => {
    const s = state();
    return {
      contents: [{
        uri: 'eqworker://reminders',
        mimeType: 'application/json',
        text: JSON.stringify(s.reminders, null, 2)
      }]
    };
  }
);

// ---------------- 提示 ----------------

server.registerPrompt(
  'weekly_review',
  {
    title: '每周人情复盘',
    description: '基于真实数据做一次本周关系经营复盘，指出该联系谁、该还谁的人情。'
  },
  async () => ({
    messages: [{
      role: 'user',
      content: {
        type: 'text',
        text: '请先调用 get_overview 和 list_persons 拿到我的真实数据，然后做一次本周人情复盘：1) 哪三段关系最需要我主动联系，为什么；2) 有没有该还的人情；3) 给我三句可以直接发出去的话，每句不超过 50 字。不要编造数据里没有的人。'
      }
    }]
  })
);

server.registerPrompt(
  'gift_decision',
  {
    title: '随礼决策',
    description: '结合关系与历史往来，帮我决定随多少礼。',
    argsSchema: { occasion: z.string().describe('什么场合，例如「同事婚礼」') }
  },
  async ({ occasion }: { occasion: string }) => ({
    messages: [{
      role: 'user',
      content: {
        type: 'text',
        text: `我要参加${occasion}，请用 advise_gift 查一下建议金额，再参考这个人和我的历史往来（get_person）给出最终建议。说明为什么是这个数，不要说空话。`
      }
    }]
  })
);

// ---------------- 启动 ----------------

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stdio 传输下，stdout 是协议通道，日志必须走 stderr
  console.error(`[eq-worker-mcp] v${VERSION} 已启动 · 数据文件 ${file}`);
}

main().catch((e: Error) => {
  console.error('[eq-worker-mcp] 启动失败：', e.message);
  process.exit(1);
});
