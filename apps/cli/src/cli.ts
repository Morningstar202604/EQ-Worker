#!/usr/bin/env node
/**
 * EQ-Worker CLI —— 在终端里查人情账本、算随礼、出话术。
 *
 * 设计原则：
 * - 零运行时依赖，只用 Node 内置模块 + 仓库内 core/node 包。
 * - 默认输出人类可读；`--json` 输出机器可读，方便脚本与管道。
 * - 所有写操作都走 core 的 Store，因此与网页端共享同一套迁移、校验与写保护逻辑。
 * - 数据目录遵循各平台惯例，可用 --data 或 EQWORKER_DATA_DIR 覆盖。
 */
import { readFileSync, existsSync } from 'node:fs';
import { createFileStore } from '../../../packages/node/src/index';
import { resolveDataFile, dataDir } from '../../../packages/node/src/index';
import {
  EVENT_TYPES,
  OCCASIONS,
  buildScripts,
  SCRIPT_SCENES,
  giftAdvice,
  personLedger,
  ledgerTotals,
  ledgerInsights,
  ledgerNetLabel,
  healthRanking,
  buildActions,
  upcomingDates,
  achievements,
  annualReport,
  monthInsights,
  computePerson,
  overallMetrics,
  getWisdom,
  getLevel,
  fmtMoney,
  fmtDate,
  uid,
  sanitizeImport,
  buildICS,
  type EventType,
  type GiftTier,
  type CityTier
} from '../../../packages/core/src/index';

const VERSION = '3.7.0';

type Flags = {
  data?: string;
  json: boolean;
  help: boolean;
  positional: string[];
  opts: Map<string, string>;
};

function parseArgs(argv: string[]): Flags {
  const flags: Flags = { json: false, help: false, positional: [], opts: new Map() };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--json') flags.json = true;
    else if (a === '-h' || a === '--help') flags.help = true;
    else if (a === '--data') { flags.data = argv[++i]; }
    else if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=');
      flags.opts.set(k, v ?? (argv[i + 1] && !argv[i + 1].startsWith('-') ? argv[++i] : 'true'));
    } else flags.positional.push(a);
  }
  return flags;
}

const C = {
  reset: '\x1b[0m', dim: '\x1b[2m', bold: '\x1b[1m',
  teal: '\x1b[36m', gold: '\x1b[33m', red: '\x1b[31m', green: '\x1b[32m'
};
const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const c = (s: string, color: keyof typeof C): string => (useColor ? `${C[color]}${s}${C.reset}` : s);

/** 分数统一保留一位小数：内部是浮点，直接打印 61.02601572684725 既不专业也没意义。 */
function num(v: number): string {
  const r = Math.round(v * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

function table(headers: string[], rows: string[][]): string {
  if (!rows.length) return c('（无数据）', 'dim');
  const width = headers.map((h, i) => Math.max(strWidth(h), ...rows.map((r) => strWidth(r[i] ?? ''))));
  const line = (cells: string[]): string => cells.map((cell, i) => pad(cell, width[i])).join('  ');
  const out = [c(line(headers), 'bold'), c(width.map((w) => '─'.repeat(w)).join('  '), 'dim')];
  for (const r of rows) out.push(line(r));
  return out.join('\n');
}

/** 中文字符占两列，用简单规则估算宽度，避免终端表格错位。 */
function strWidth(s: string): number {
  let w = 0;
  for (const ch of s) w += /[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/.test(ch) ? 2 : 1;
  return w;
}
function pad(s: string, width: number): string {
  const diff = width - strWidth(s);
  return diff > 0 ? s + ' '.repeat(diff) : s;
}

function openStore(flags: Flags) {
  const file = resolveDataFile(flags.data);
  return { store: createFileStore(file), file };
}

function requireData(store: ReturnType<typeof createFileStore>): boolean {
  const state = store.getState();
  if (!state.persons.length) {
    console.error(c('还没有任何数据。', 'gold'));
    console.error(c(`数据文件：${resolveDataFile()}`, 'dim'));
    console.error('先添加人脉：' + c('eqw add-person --name 张三 --identity 朋友', 'teal'));
    return false;
  }
  return true;
}

// ---------------- 命令 ----------------

function cmdOverview(flags: Flags): number {
  const { store, file } = openStore(flags);
  const state = store.getState();
  const m = overallMetrics(state);
  if (flags.json) {
    console.log(JSON.stringify({ metrics: m, persons: state.persons.length, events: state.events.length, file }, null, 2));
    return 0;
  }
  if (!m) {
    console.log(c('人脉雷达还没启动。', 'gold'));
    console.log(c('先添加第一位人脉，或用 eqw demo 载入演示数据。', 'dim'));
    return 0;
  }
  const w = getWisdom(state);
  const lv = getLevel(w);
  console.log(c('EQ-Worker 概览', 'bold'));
  console.log(c(`数据文件 ${file}`, 'dim'));
  console.log('');
  console.log(`  人情指数  ${c(String(m.index), 'teal')} / 100`);
  console.log(`  人脉规模  ${num(m.scale)}    人情热度  ${num(m.heatAvg)}    往来频率  ${num(m.freq)}`);
  console.log(`  人情信用  ${num(m.credit)}    处世智慧  ${num(m.wisdom)}`);
  console.log(`  段位      ${lv.cur.name}（${w} 智慧值）`);
  console.log('');
  const totals = ledgerTotals(state);
  console.log(c('人情账本', 'bold'));
  console.log(`  累计给出 ${fmtMoney(totals.given)}    累计收到 ${fmtMoney(totals.received)}    净额 ${ledgerNetLabel(totals.net)}`);
  console.log(`  我欠 ${totals.oweCount} 人 ${fmtMoney(totals.owe)}    应收 ${totals.dueCount} 人 ${fmtMoney(totals.due)}`);
  console.log('');
  const actions = buildActions(state, 5);
  if (actions.length) {
    console.log(c('今天值得做', 'bold'));
    for (const a of actions) console.log(`  · ${a.title}${a.reason ? c(` ${a.reason}`, 'dim') : ''}`);
    console.log('');
  }
  const up = upcomingDates(state, 30);
  if (up.length) {
    console.log(c('未来 30 天', 'bold'));
    for (const u of up.slice(0, 6)) console.log(`  ${String(u.days).padStart(3)} 天后  ${u.name}${c(`（${u.kind}）`, 'dim')}`);
  }
  return 0;
}

function cmdPersons(flags: Flags): number {
  const { store } = openStore(flags);
  const state = store.getState();
  if (!requireData(store)) return 1;
  const rows = state.persons.map((p) => {
    const l = personLedger(state, p.id);
    const cp = computePerson(state, p);
    return [
      p.name,
      p.identity || '—',
      num(cp.heat),
      num(cp.debt),
      ledgerNetLabel(l.net),
      cp.lastDays === null ? '—' : `${cp.lastDays} 天前`
    ];
  });
  if (flags.json) {
    // 扁平结构：与表格列一一对应，脚本不必再钻两层去取 heat/debt。
    console.log(JSON.stringify(state.persons.map((p) => {
      const cp = computePerson(state, p);
      const l = personLedger(state, p.id);
      return {
        id: p.id, name: p.name, identity: p.identity, tags: p.tags,
        birthday: p.birthday, note: p.note,
        heat: Math.round(cp.heat * 10) / 10,
        trust: Math.round(cp.trust * 10) / 10,
        intimacy: Math.round(cp.intimacy * 10) / 10,
        debt: Math.round(cp.debt * 10) / 10,
        lastDays: cp.lastDays,
        eventCount: cp.eventCount,
        given: l.given, received: l.received, net: l.net, netLabel: ledgerNetLabel(l.net)
      };
    }), null, 2));
    return 0;
  }
  console.log(table(['姓名', '身份', '热度', '人情债', '账本净额', '最后往来'], rows));
  return 0;
}

function cmdPerson(flags: Flags): number {
  const name = flags.positional[1];
  if (!name) { console.error('用法：eqw person <姓名>'); return 2; }
  const { store } = openStore(flags);
  const state = store.getState();
  const p = state.persons.find((x) => x.name === name || x.id === name);
  if (!p) { console.error(c(`找不到「${name}」`, 'red')); return 1; }
  const cp = computePerson(state, p);
  const l = personLedger(state, p.id);
  const events = state.events.filter((e) => e.personId === p.id).sort((a, b) => b.time - a.time);
  if (flags.json) {
    console.log(JSON.stringify({ person: p, computed: cp, ledger: l, events }, null, 2));
    return 0;
  }
  console.log(c(`${p.name}`, 'bold') + c(` ${p.identity || ''}`, 'dim'));
  if (p.tags.length) console.log(c(`标签：${p.tags.join('、')}`, 'dim'));
  if (p.note) console.log(c(`备注：${p.note}`, 'dim'));
  console.log('');
  console.log(`  热度 ${num(cp.heat)}   信任 ${num(cp.trust)}   亲密 ${num(cp.intimacy)}   活跃 ${num(cp.activity)}   人情债 ${num(cp.debt)}`);
  console.log(`  账本：${ledgerNetLabel(l.net)} 给出 ${fmtMoney(l.given)} 收到 ${fmtMoney(l.received)}`);
  if (cp.lastDays !== null) console.log(`  最后往来：${cp.lastDays} 天前`);
  console.log('');
  if (events.length) {
    console.log(c('往来记录', 'bold'));
    for (const e of events.slice(0, 10)) {
      const t = EVENT_TYPES[e.type]?.label ?? e.type;
      const amt = e.amount > 0 ? ` ${fmtMoney(e.amount)}` : '';
      console.log(`  ${fmtDate(e.time)}  ${t.padEnd(6)}  ${e.title}${c(amt, 'dim')}`);
    }
    if (events.length > 10) console.log(c(`  …还有 ${events.length - 10} 条`, 'dim'));
  }
  return 0;
}

function cmdLedger(flags: Flags): number {
  const { store } = openStore(flags);
  const state = store.getState();
  const totals = ledgerTotals(state);
  const ins = ledgerInsights(state);
  if (flags.json) { console.log(JSON.stringify({ totals, insights: ins }, null, 2)); return 0; }
  if (!state.persons.length) { console.log(c('还没有账本记录。', 'dim')); return 0; }
  console.log(c('人情账本', 'bold'));
  console.log(`  累计给出 ${c(fmtMoney(totals.given), 'teal')}   累计收到 ${c(fmtMoney(totals.received), 'teal')}   净额 ${ledgerNetLabel(totals.net)}`);
  console.log(`  本月给出 ${fmtMoney(ins.monthGiven)}（${ins.monthCount} 笔）   本月收到 ${fmtMoney(ins.monthReceived)}`);
  console.log(`  平均每笔 ${fmtMoney(ins.avgGiven)}   最大单笔 ${fmtMoney(ins.maxGift)}`);
  if (ins.topOccasion) console.log(`  最花心思的场合：${ins.topOccasion}（${fmtMoney(ins.topOccasionAmount)}）`);
  console.log('');
  const rows = state.persons
    .map((p) => ({ p, l: personLedger(state, p.id) }))
    .filter((x) => x.l.net !== 0)
    .sort((a, b) => Math.abs(b.l.net) - Math.abs(a.l.net))
    .map((x) => [x.p.name, fmtMoney(x.l.given), fmtMoney(x.l.received), ledgerNetLabel(x.l.net)]);
  console.log(table(['姓名', '给出', '收到', '净额'], rows));
  return 0;
}

function cmdGift(flags: Flags): number {
  const name = flags.positional[1];
  const occasion = flags.opts.get('occasion') ?? '婚礼';
  const tier = (flags.opts.get('tier') ?? 'standard') as GiftTier;
  const city = (flags.opts.get('city') ?? '二线') as CityTier;
  const { store } = openStore(flags);
  const state = store.getState();
  const p = name ? state.persons.find((x) => x.name === name || x.id === name) : null;
  if (name && !p) { console.error(c(`找不到「${name}」`, 'red')); return 1; }
  if (!(OCCASIONS as readonly string[]).includes(occasion)) {
    console.error(c(`场合不支持：${occasion}。可选：${OCCASIONS.join('、')}`, 'red'));
    return 2;
  }
  const advice = giftAdvice(state, p ? p.id : '', occasion, { tier, city });
  if (flags.json) { console.log(JSON.stringify(advice, null, 2)); return 0; }
  console.log(c('随礼参谋', 'bold') + c(` ${p ? p.name : '通用'} · ${occasion}`, 'dim'));
  console.log('');
  console.log(`  从简 ${c(fmtMoney(advice.low), 'dim')}      建议 ${c(fmtMoney(advice.mid), 'teal')}      重视 ${c(fmtMoney(advice.high), 'dim')}`);
  console.log('');
  if (advice.note) console.log(c(advice.note, 'gold'));
  console.log(c('计算依据', 'bold'));
  for (const r of advice.reasons) console.log(c(`  · ${r}`, 'dim'));
  return 0;
}

function cmdScript(flags: Flags): number {
  const sceneArg = flags.positional[1];
  const name = flags.opts.get('to') ?? '';
  const { store } = openStore(flags);
  const state = store.getState();
  if (flags.opts.get('list')) {
    if (flags.json) { console.log(JSON.stringify(SCRIPT_SCENES.map((s) => ({ id: s.id, label: s.label, hint: s.hint })), null, 2)); return 0; }
    console.log(c('可用场景', 'bold'));
    for (const s of SCRIPT_SCENES) console.log(`  ${s.id.padEnd(18)} ${s.label} ${c(s.hint, 'dim')}`);
    return 0;
  }
  const scene = sceneArg ? SCRIPT_SCENES.find((s) => s.id === sceneArg || s.label === sceneArg) : SCRIPT_SCENES[0];
  if (!scene) { console.error(c(`场景不存在：${sceneArg}。用 --list 查看全部。`, 'red')); return 2; }
  const p = name ? state.persons.find((x) => x.name === name || x.id === name) : null;
  const r = buildScripts(state, scene.id, p ? p.id : '', flags.opts.get('context') ?? '');
  if (flags.json) { console.log(JSON.stringify(r, null, 2)); return 0; }
  console.log(c(`${scene.label}`, 'bold') + (p ? c(` 对 ${p.name}`, 'dim') : ''));
  console.log(c(scene.hint, 'dim'));
  console.log('');
  for (const v of r.variants) {
    console.log(c(`【${v.tone}】`, 'gold'));
    console.log(`  ${v.text}`);
    console.log('');
  }
  return 0;
}

function cmdAddPerson(flags: Flags): number {
  const name = flags.opts.get('name') ?? flags.positional[1];
  if (!name) { console.error('用法：eqw add-person --name 张三 [--identity 朋友] [--birthday 03-15] [--note 备注] [--tags 同事,球友]'); return 2; }
  const { store } = openStore(flags);
  const state = store.getState();
  if (state.persons.some((p) => p.name === name)) {
    console.error(c(`「${name}」已存在`, 'red')); return 1;
  }
  const person = {
    id: uid(),
    name,
    identity: flags.opts.get('identity') ?? '朋友',
    tags: (flags.opts.get('tags') ?? '').split(',').map((s) => s.trim()).filter(Boolean),
    birthday: flags.opts.get('birthday') ?? '',
    anniversary: flags.opts.get('anniversary') ?? '',
    likes: flags.opts.get('likes') ?? '',
    taboos: flags.opts.get('taboos') ?? '',
    note: flags.opts.get('note') ?? '',
    adjust: 0,
    createdAt: Date.now()
  };
  state.persons.push(person);
  store.setState(state);
  if (!store.save()) { console.error(c('保存失败：存储不可写', 'red')); return 1; }
  if (flags.json) { console.log(JSON.stringify(person, null, 2)); return 0; }
  console.log(c(`已添加 ${name}`, 'green'));
  return 0;
}

function cmdAddEvent(flags: Flags): number {
  const name = flags.opts.get('to') ?? flags.positional[1];
  const type = (flags.opts.get('type') ?? 'meal') as EventType;
  if (!name) { console.error('用法：eqw record --to 张三 [--type gift_give] [--title 生日送礼] [--amount 500] [--occasion 生日] [--dir in|out]'); return 2; }
  if (!EVENT_TYPES[type]) {
    console.error(c(`事件类型不支持：${type}。可选：${Object.keys(EVENT_TYPES).join('、')}`, 'red'));
    return 2;
  }
  const { store } = openStore(flags);
  const state = store.getState();
  const p = state.persons.find((x) => x.name === name || x.id === name);
  if (!p) { console.error(c(`找不到「${name}」`, 'red')); return 1; }
  const meta = EVENT_TYPES[type];
  const amount = Number(flags.opts.get('amount') ?? 0);
  const dirFlag = flags.opts.get('dir');
  const dir: 'in' | 'out' | 'none' = dirFlag === 'in' || dirFlag === 'out' || dirFlag === 'none'
    ? dirFlag
    : type === 'gift_get' ? 'in' : type === 'gift_give' ? 'out' : 'none';
  /* 金额型「金钱往来」必须给方向：缺方向时这笔钱既不算借入也不算借出，
     账本、催还、还款提醒全部看不到它——用户以为记上了，实际等于没记。
     宁可报错让他补 --dir，也不要静默存一条不入账的记录。 */
  if (type === 'money' && amount > 0 && dir === 'none') {
    console.error(c('金钱往来需要明确方向：--dir in（我借入）或 --dir out（我借出）。', 'red'));
    return 1;
  }
  const event = {
    id: uid(),
    personId: p.id,
    type,
    title: flags.opts.get('title') ?? meta.label,
    time: flags.opts.get('date') ? new Date(flags.opts.get('date') as string).getTime() : Date.now(),
    weight: Number(flags.opts.get('weight') ?? meta.dHeat),
    note: flags.opts.get('note') ?? '',
    amount: Number.isFinite(amount) && amount > 0 ? amount : 0,
    dir,
    occasion: flags.opts.get('occasion') ?? '日常'
  };
  state.events.push(event);
  state.lastEventId = event.id;
  store.setState(state);
  if (!store.save()) { console.error(c('保存失败：存储不可写', 'red')); return 1; }
  if (flags.json) { console.log(JSON.stringify(event, null, 2)); return 0; }
  console.log(c(`已记录：${p.name} · ${event.title}${event.amount ? ' ' + fmtMoney(event.amount) : ''}`, 'green'));
  return 0;
}

function cmdHealth(flags: Flags): number {
  const { store } = openStore(flags);
  const state = store.getState();
  if (!requireData(store)) return 1;
  const ranking = healthRanking(state);
  if (flags.json) { console.log(JSON.stringify(ranking.map((r) => ({ name: r.p.name, ...r.h })), null, 2)); return 0; }
  console.log(c('关系体检（按健康度从低到高）', 'bold'));
  console.log('');
  const rows = ranking.slice(0, 12).map((r) => [
    r.p.name, r.h.level, String(r.h.score),
    r.h.score < 50 ? c('需要经营', 'red') : r.h.score < 70 ? c('状态不错', 'gold') : c('经营良好', 'green')
  ]);
  console.log(table(['姓名', '状态', '分数', '建议'], rows));
  return 0;
}

function cmdPractice(flags: Flags): number {
  const { store } = openStore(flags);
  const state = store.getState();
  const w = getWisdom(state);
  const lv = getLevel(w);
  const done = Object.keys(state.progress).filter((k) => state.progress[k].times > 0).length;
  if (flags.json) {
    console.log(JSON.stringify({ wisdom: w, level: lv.cur, progress: state.progress, streak: state.streak, done }, null, 2));
    return 0;
  }
  console.log(c('人情修炼场', 'bold'));
  console.log(`  段位 ${c(lv.cur.name, 'teal')} 智慧值 ${w}`);
  console.log(c(`  ${lv.cur.desc}`, 'dim'));
  if (lv.nxt) console.log(`  距「${lv.nxt.name}」还差 ${lv.nxt.min - w} 分`);
  console.log(`  已完成 ${done} 题 连续修炼 ${state.streak.n} 天`);
  return 0;
}

function cmdAchievements(flags: Flags): number {
  const { store } = openStore(flags);
  const list = achievements(store.getState());
  const got = list.filter((a) => a.done).length;
  if (flags.json) { console.log(JSON.stringify({ got, total: list.length, list }, null, 2)); return 0; }
  console.log(c(`成就徽章 ${got}/${list.length} 已达成`, 'bold'));
  console.log('');
  for (const a of list) {
    const mark = a.done ? c('●', 'gold') : c('○', 'dim');
    const prog = a.done ? c('已达成', 'green') : c(`${a.cur}/${a.need}`, 'dim');
    console.log(`  ${mark} ${pad(a.t, 10)} ${c(a.d, 'dim')}  ${prog}`);
  }
  return 0;
}

function cmdReport(flags: Flags): number {
  const { store } = openStore(flags);
  const state = store.getState();
  const r = annualReport(state);
  const m = monthInsights(state);
  if (flags.json) { console.log(JSON.stringify({ annual: r, month: m }, null, 2)); return 0; }
  console.log(c('近 12 个月回顾', 'bold') + c(` 共 ${r.total} 笔往来`, 'dim'));
  console.log('');
  const peak = r.peak || 1;
  for (const mo of r.months) {
    const bars = Math.round((mo.count / peak) * 30);
    console.log(`  ${pad(mo.label, 4)} ${c('█'.repeat(bars) || '·', mo.count ? 'teal' : 'dim')} ${mo.count || ''}`);
  }
  console.log('');
  if (r.topPersons.length) console.log(`  最常走动：${r.topPersons.map((p) => `${p.name} ${p.count} 笔`).join('、')}`);
  if (r.topDebts.length) console.log(`  人情债前三：${r.topDebts.map((d) => `${d.name} ${Math.round(d.debt)}`).join('、')}`);
  console.log('');
  for (const k of r.keywords) console.log(`  · ${k}`);
  console.log('');
  console.log(c(`本月：${m.count} 笔往来，新增 ${m.newPersons} 位人脉`, 'dim'));
  return 0;
}

function cmdExport(flags: Flags): number {
  const { store } = openStore(flags);
  const format = flags.opts.get('format') ?? 'json';
  if (format === 'csv') {
    const state = store.getState();
    const esc = (v: string): string => /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
    const lines = ['姓名,身份,标签,累计给出,累计收到,净额'];
    for (const p of state.persons) {
      const l = personLedger(state, p.id);
      lines.push([p.name, p.identity, p.tags.join('|'), l.given, l.received, l.net].map((x) => esc(String(x))).join(','));
    }
    console.log(lines.join('\n'));
    return 0;
  }
  if (format === 'ics') {
    console.log(buildICS(store.getState()));
    return 0;
  }
  console.log(store.exportJSON());
  return 0;
}

function cmdImport(flags: Flags): number {
  const file = flags.positional[1];
  if (!file) { console.error('用法：eqw import <备份文件.json>'); return 2; }
  const text = readFileSync(file, 'utf8');
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch (e) {
    console.error(c(`JSON 解析失败：${(e as Error).message}`, 'red')); return 1;
  }
  const clean = sanitizeImport(parsed as Parameters<typeof sanitizeImport>[0]);
  /* 只要没有联系人就必须中止：只剩事件的备份会清空现有联系人，留下孤儿事件。 */
  if (!clean.persons.length) {
    console.error(c('导入数据里没有可用的联系人，已中止（不会覆盖现有数据）。', 'red'));
    return 1;
  }
  const { store } = openStore(flags);
  /* applyImport 已负责落盘与失败回滚；重复 save() 会在回滚后再写一次，
     造成「报成功但其实没导入」。 */
  if (!store.applyImport(clean)) { console.error(c('保存失败，未修改现有数据', 'red')); return 1; }
  const st = store.getState();
  console.log(c(`已导入 ${st.persons.length} 位人脉、${st.events.length} 条往来`, 'green'));
  for (const w of clean.warn) console.log(c(`  警告：${w}`, 'gold'));
  if (clean.schemaMismatch) console.log(c('  注意：数据版本与当前不一致，已按当前版本迁移。', 'gold'));
  return 0;
}

function cmdDemo(flags: Flags): number {
  const { store } = openStore(flags);
  const now = Date.now();
  const DAY = 86400000;
  const mk = (name: string, identity: string, tags: string[], birthday: string, note: string) => ({
    id: uid(), name, identity, tags, birthday, anniversary: '', likes: '', taboos: '', note, adjust: 0, createdAt: now - 90 * DAY
  });
  const people = [
    mk('王总', '领导', ['直属领导', '关键人脉'], '05-12', '提携过我两次'),
    mk('陈姐', '客户', ['长期合作'], '09-08', '做事靠谱'),
    mk('老张', '朋友', ['大学死党', '球友'], '11-20', '上周借了车'),
    mk('李叔', '邻居', ['楼下'], '', ''),
    mk('阿明', '同学', ['高中'], '02-14', ''),
    mk('老爸', '家人', ['至亲'], '07-01', '')
  ];
  const ev = (pid: string, type: EventType, title: string, daysAgo: number, amount: number, occasion: string) => {
    const meta = EVENT_TYPES[type];
    return {
      id: uid(), personId: pid, type, title, time: now - daysAgo * DAY, weight: meta.dHeat,
      note: '', amount,
      dir: type === 'gift_get' ? 'in' as const : type === 'gift_give' ? 'out' as const : 'none' as const,
      occasion
    };
  };
  const [boss, chen, zhang, li, ming, dad] = people.map((p) => p.id);
  const events = [
    ev(boss, 'help_them', '帮王总整理了一份汇报材料', 12, 0, '日常'),
    ev(boss, 'meal', '请王总吃了顿饭', 30, 600, '日常'),
    ev(chen, 'gift_get', '客户婚礼收礼', 45, 800, '婚礼'),
    ev(chen, 'meal', '和陈姐吃饭谈合作', 8, 0, '日常'),
    ev(zhang, 'help_them', '老张借车给我', 5, 0, '日常'),
    ev(zhang, 'gift_give', '老张生日送礼', 60, 800, '生日'),
    ev(zhang, 'meal', '撸串', 20, 260, '日常'),
    ev(li, 'greeting', '给李叔拜年', 90, 0, '节日'),
    ev(ming, 'gift_get', '阿明婚礼收礼', 100, 1000, '婚礼'),
    ev(ming, 'talk', '和阿明聊了很久', 15, 0, '日常'),
    ev(dad, 'gift_give', '给老爸买了按摩仪', 40, 600, '生日'),
    ev(dad, 'meal', '回家吃饭', 7, 0, '日常')
  ];
  const state = store.getState();
  state.persons = people;
  state.events = events;
  state.reminders = [
    { id: uid(), personId: zhang, content: '请老张吃顿饭，还上次借车的人情', date: '', status: 'pending' as const }
  ];
  store.setState(state);
  if (!store.save()) { console.error(c('保存失败', 'red')); return 1; }
  console.log(c(`已生成演示数据：${people.length} 位人脉、${events.length} 条往来`, 'green'));
  console.log(c('注意：这会覆盖当前数据文件。', 'gold'));
  return 0;
}

function cmdActions(flags: Flags): number {
  const { store } = openStore(flags);
  const list = buildActions(store.getState(), 10);
  if (flags.json) { console.log(JSON.stringify(list, null, 2)); return 0; }
  if (!list.length) { console.log(c('今天没有需要紧急处理的事。', 'dim')); return 0; }
  console.log(c('今日行动', 'bold'));
  for (const a of list) console.log(`  · ${a.title}\n    ${c(a.reason, 'dim')}`);
  return 0;
}


/** 搜索：跨姓名、标签、备注、往来标题模糊匹配。 */
function cmdSearch(flags: Flags): number {
  const kw = (flags.positional[1] ?? '').trim().toLowerCase();
  if (!kw) { console.error('用法：eqw search <关键词>'); return 2; }
  const { store } = openStore(flags);
  const state = store.getState();

  const persons = state.persons.filter((p) =>
    `${p.name} ${p.identity} ${(p.tags || []).join(' ')} ${p.note}`.toLowerCase().includes(kw)
  );
  const events = state.events.filter((e) => {
    const p = state.persons.find((x) => x.id === e.personId);
    return `${e.title} ${e.note} ${e.occasion} ${p ? p.name : ''}`.toLowerCase().includes(kw);
  });

  if (flags.json) { console.log(JSON.stringify({ persons, events }, null, 2)); return 0; }
  if (!persons.length && !events.length) { console.log(c(`没有匹配「${kw}」的记录`, 'dim')); return 0; }

  if (persons.length) {
    console.log(c(`人脉（${persons.length}）`, 'bold'));
    for (const p of persons) console.log(`  ${p.name} ${c(p.identity || '', 'dim')} ${c((p.tags || []).join('、'), 'dim')}`);
    console.log('');
  }
  if (events.length) {
    console.log(c(`往来（${events.length}）`, 'bold'));
    for (const e of events.slice(0, 20)) {
      const p = state.persons.find((x) => x.id === e.personId);
      console.log(`  ${fmtDate(e.time)}  ${p ? p.name : '?'}  ${e.title}${e.amount ? c(` ${fmtMoney(e.amount)}`, 'dim') : ''}`);
    }
    if (events.length > 20) console.log(c(`  …还有 ${events.length - 20} 条`, 'dim'));
  }
  return 0;
}

/** 待办：列出与完成提醒。 */
function cmdReminders(flags: Flags): number {
  const { store } = openStore(flags);
  const state = store.getState();
  const pending = state.reminders.filter((r) => r.status === 'pending');

  if (flags.opts.has('done')) {
    const id = flags.opts.get('done');
    const r = state.reminders.find((x) => x.id === id);
    if (!r) { console.error(c(`找不到提醒 ${id}`, 'red')); return 1; }
    r.status = 'done';
    store.setState(state);
    if (!store.save()) { console.error(c('保存失败', 'red')); return 1; }
    console.log(c('已完成', 'green'));
    return 0;
  }

  if (flags.json) { console.log(JSON.stringify(state.reminders, null, 2)); return 0; }
  if (!pending.length) { console.log(c('没有待办。', 'dim')); return 0; }
  console.log(c(`待办（${pending.length}）`, 'bold'));
  for (const r of pending) {
    const p = state.persons.find((x) => x.id === r.personId);
    console.log(`  ${c(r.id, 'dim')}  ${p ? p.name + ' · ' : ''}${r.content}${r.date ? c(` ${r.date}`, 'dim') : ''}`);
  }
  console.log('');
  console.log(c('完成：eqw reminders --done <id>', 'dim'));
  return 0;
}

/** 校验：检查数据文件完整性与一致性问题。 */
function cmdDoctor(flags: Flags): number {
  const { store, file } = openStore(flags);
  const state = store.getState();
  const issues: string[] = [];
  const info: string[] = [];

  info.push(`数据文件：${file}`);
  info.push(`人脉 ${state.persons.length} 位，往来 ${state.events.length} 条，提醒 ${state.reminders.length} 条`);

  // 孤立事件：指向不存在的人
  const orphan = state.events.filter((e) => !state.persons.some((p) => p.id === e.personId));
  if (orphan.length) issues.push(`${orphan.length} 条往来指向不存在的联系人（孤立记录）`);

  // 重复 id
  const ids = new Set<string>();
  for (const p of state.persons) {
    if (ids.has(p.id)) issues.push(`联系人 id 重复：${p.id}`);
    ids.add(p.id);
  }

  // 非法数值
  const badAmount = state.events.filter((e) => !Number.isFinite(Number(e.amount)) || Number(e.amount) < 0);
  if (badAmount.length) issues.push(`${badAmount.length} 条往来金额非法（负数或非数字）`);

  const badBirthday = state.persons.filter((p) => p.birthday && !/^\d{2}-\d{2}$/.test(p.birthday));
  if (badBirthday.length) issues.push(`${badBirthday.length} 位联系人生日格式非 MM-DD`);

  // 未来时间的事件（可能是录入错误）
  const future = state.events.filter((e) => e.time > Date.now() + 86400000);
  if (future.length) issues.push(`${future.length} 条往来的时间在明天之后（可能录错）`);

  if (flags.json) { console.log(JSON.stringify({ file, info, issues }, null, 2)); return issues.length ? 1 : 0; }
  for (const i of info) console.log(c(i, 'dim'));
  console.log('');
  if (!issues.length) { console.log(c('✓ 数据检查通过，未发现问题', 'green')); return 0; }
  console.log(c(`发现 ${issues.length} 个问题：`, 'gold'));
  for (const i of issues) console.log(`  ! ${i}`);
  return 1;
}

function cmdWhere(flags: Flags): number {
  const file = resolveDataFile(flags.data);
  const dir = dataDir(flags.data);
  if (flags.json) { console.log(JSON.stringify({ dataDir: dir, dataFile: file, exists: existsSync(file) }, null, 2)); return 0; }
  console.log(`数据目录  ${dir}`);
  console.log(`数据文件  ${file}`);
  console.log(`是否存在  ${existsSync(file) ? '是' : '否'}`);
  return 0;
}

// ---------------- 帮助与分发 ----------------

const HELP = `${c('EQ-Worker CLI', 'bold')}  v${VERSION}

${c('用法', 'bold')}
  eqw <命令> [参数] [--json] [--data 目录]

${c('查看', 'bold')}
  overview                人情指数、账本总览、今日行动、近期日子
  persons                 人脉列表（热度、人情债、账本净额）
  person <姓名>           单个联系人的完整画像与往来记录
  ledger                 人情账本明细与洞察
  actions                 今天值得做的事
  health                  关系体检排行
  practice                修炼进度与段位
  achievements            成就徽章
  report                  近 12 个月回顾
  search <关键词>         跨姓名/标签/备注/往来搜索
  reminders               待办列表    --done <id> 标记完成
  doctor                  数据体检（孤立记录、非法金额、格式错误）

${c('参谋', 'bold')}
  gift [姓名]             随礼参谋    --occasion 婚礼 --tier standard --city 二线
  script [场景]           话术参谋    --to 姓名 --context 背景 --list 列出场景

${c('写入', 'bold')}
  add-person              添加人脉    --name 张三 --identity 朋友 --birthday 03-15 --tags a,b --note 备注
  record                  记一笔      --to 张三 --type gift_give --title 生日送礼 --amount 500 --occasion 生日
                                      金钱往来必须带方向：--type money --amount 5000 --dir out（我借出）
  demo                    载入演示数据（会覆盖当前数据）

${c('数据', 'bold')}
  export                  导出数据    --format json|csv|ics
  import <文件>           导入 JSON 备份
  where                   显示数据文件位置

${c('全局参数', 'bold')}
  --json                  机器可读输出，便于脚本与管道
  --data <目录>           指定数据目录（默认见 eqw where）
  --no-color              关闭颜色
  -h, --help              显示帮助

${c('环境变量', 'bold')}
  EQWORKER_DATA_DIR       覆盖数据目录
  NO_COLOR                关闭颜色

${c('示例', 'bold')}
  eqw overview
  eqw gift 陈姐 --occasion 婚礼
  eqw script refuse_loan --to 老张
  eqw record --to 王总 --type meal --title 请吃饭
  eqw export --format csv > 账本.csv
`;

function main(argv: string[]): number {
  const flags = parseArgs(argv);
  const cmd = flags.positional[0];
  if (flags.help || !cmd) { console.log(HELP); return 0; }
  switch (cmd) {
    case 'overview': case 'o': return cmdOverview(flags);
    case 'persons': case 'ls': return cmdPersons(flags);
    case 'person': return cmdPerson(flags);
    case 'ledger': return cmdLedger(flags);
    case 'gift': return cmdGift(flags);
    case 'script': return cmdScript(flags);
    case 'add-person': return cmdAddPerson(flags);
    case 'record': return cmdAddEvent(flags);
    case 'health': return cmdHealth(flags);
    case 'practice': return cmdPractice(flags);
    case 'achievements': return cmdAchievements(flags);
    case 'report': return cmdReport(flags);
    case 'actions': return cmdActions(flags);
    case 'export': return cmdExport(flags);
    case 'import': return cmdImport(flags);
    case 'demo': return cmdDemo(flags);
    case 'search': return cmdSearch(flags);
    case 'reminders': return cmdReminders(flags);
    case 'doctor': return cmdDoctor(flags);
    case 'where': return cmdWhere(flags);
    case 'version': case '-v': console.log(VERSION); return 0;
    default:
      console.error(c(`未知命令：${cmd}`, 'red'));
      console.error('运行 eqw --help 查看全部命令。');
      return 2;
  }
}

process.exitCode = main(process.argv.slice(2));
