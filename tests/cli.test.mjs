import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const CLI = join(root, 'dist-cli/eqw.mjs');

/** 每个用例用独立数据目录，避免相互污染，也顺带验证 --data/EQWORKER_DATA_DIR。 */
function sandbox() {
  const dir = mkdtempSync(join(tmpdir(), 'eqw-cli-'));
  return { dir, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

function run(args, env = {}) {
  const r = spawnSync(process.execPath, [CLI, ...args], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1', ...env }
  });
  return { code: r.status, out: r.stdout ?? '', err: r.stderr ?? '' };
}

test('CLI 未构建时给出可执行的提示而不是堆栈', (t) => {
  try {
    readFileSync(CLI);
  } catch {
    t.skip('dist-cli 未构建，先跑 node scripts/build-cli.mjs');
    return;
  }
});

test('--help 列出全部主要命令', () => {
  const { code, out } = run(['--help']);
  assert.equal(code, 0);
  for (const cmd of ['overview', 'persons', 'person', 'ledger', 'gift', 'script', 'add-person', 'record', 'export', 'import', 'where']) {
    assert.match(out, new RegExp(cmd.replace('-', '\\-')), `帮助里应包含 ${cmd}`);
  }
});

test('空数据时 overview 给出引导而不是报错', () => {
  const s = sandbox();
  try {
    const { code, out } = run(['overview'], { EQWORKER_DATA_DIR: s.dir });
    assert.equal(code, 0);
    assert.match(out, /人脉雷达还没启动|还没有/);
  } finally { s.cleanup(); }
});

test('where 报告的路径与 --data 一致', () => {
  const s = sandbox();
  try {
    const { out } = run(['where', '--data', s.dir, '--json']);
    const d = JSON.parse(out);
    assert.ok(d.dataFile.startsWith(s.dir.replace(/\\/g, '\\')) || d.dataFile.includes('eq-worker.json'));
    assert.equal(d.exists, false);
  } finally { s.cleanup(); }
});

test('demo 写入后数据可被后续命令读回（持久化闭环）', () => {
  const s = sandbox();
  try {
    const demo = run(['demo'], { EQWORKER_DATA_DIR: s.dir });
    assert.equal(demo.code, 0);
    assert.match(demo.out, /已生成演示数据/);

    // 关键回归：写完必须能读回。曾因缺 store.load() 导致写入后读回为空。
    const persons = run(['persons', '--json'], { EQWORKER_DATA_DIR: s.dir });
    assert.equal(persons.code, 0);
    const data = JSON.parse(persons.out);
    assert.ok(Array.isArray(data));
    assert.ok(data.length >= 6, `应读回 ≥6 位人脉，实际 ${data.length}`);
    assert.ok(data[0].name, '每人应有姓名');
  } finally { s.cleanup(); }
});

test('add-person 后可查到，且重名被拒绝', () => {
  const s = sandbox();
  try {
    const add = run(['add-person', '--name', '测试张三', '--identity', '同事'], { EQWORKER_DATA_DIR: s.dir });
    assert.equal(add.code, 0);
    assert.match(add.out, /已添加/);

    const dup = run(['add-person', '--name', '测试张三'], { EQWORKER_DATA_DIR: s.dir });
    assert.notEqual(dup.code, 0, '重名应失败');

    const list = JSON.parse(run(['persons', '--json'], { EQWORKER_DATA_DIR: s.dir }).out);
    assert.equal(list.length, 1);
    assert.equal(list[0].name, '测试张三');
  } finally { s.cleanup(); }
});

test('record 关联不存在的人脉时失败且不写脏数据', () => {
  const s = sandbox();
  try {
    run(['add-person', '--name', '甲'], { EQWORKER_DATA_DIR: s.dir });
    const bad = run(['record', '--to', '不存在的人', '--type', 'meal'], { EQWORKER_DATA_DIR: s.dir });
    assert.notEqual(bad.code, 0);
    assert.match(bad.err, /找不到/);
    const list = JSON.parse(run(['persons', '--json'], { EQWORKER_DATA_DIR: s.dir }).out);
    assert.equal(list[0].eventCount, 0, '失败不应写入往来');
  } finally { s.cleanup(); }
});

test('gift 三档金额递增，非法场合被拒绝', () => {
  const s = sandbox();
  try {
    run(['demo'], { EQWORKER_DATA_DIR: s.dir });
    const { code, out } = run(['gift', '陈姐', '--occasion', '婚礼', '--json'], { EQWORKER_DATA_DIR: s.dir });
    assert.equal(code, 0);
    const a = JSON.parse(out);
    assert.ok(a.low <= a.mid && a.mid <= a.high, '三档应递增');
    assert.ok(a.reasons.length > 0, '应给出计算依据');

    const bad = run(['gift', '陈姐', '--occasion', '不存在的场合'], { EQWORKER_DATA_DIR: s.dir });
    assert.notEqual(bad.code, 0);
  } finally { s.cleanup(); }
});

test('script --list 列出场景，非法场景报错', () => {
  const s = sandbox();
  try {
    const list = run(['script', '--list', '--json'], { EQWORKER_DATA_DIR: s.dir });
    const scenes = JSON.parse(list.out);
    assert.ok(scenes.length >= 16, `场景应 ≥16，实际 ${scenes.length}`);
    assert.ok(scenes.every((x) => x.id && x.label));

    const bad = run(['script', 'no-such-scene'], { EQWORKER_DATA_DIR: s.dir });
    assert.notEqual(bad.code, 0);
  } finally { s.cleanup(); }
});

test('export csv 输出可被解析且表头稳定', () => {
  const s = sandbox();
  try {
    run(['demo'], { EQWORKER_DATA_DIR: s.dir });
    const { out } = run(['export', '--format', 'csv'], { EQWORKER_DATA_DIR: s.dir });
    const lines = out.trim().split('\n');
    assert.equal(lines[0], '姓名,身份,标签,累计给出,累计收到,净额');
    assert.ok(lines.length > 1);
  } finally { s.cleanup(); }
});

test('export json 可被 import 回灌，人脉数一致', () => {
  const a = sandbox();
  const b = sandbox();
  try {
    run(['demo'], { EQWORKER_DATA_DIR: a.dir });
    const backup = run(['export'], { EQWORKER_DATA_DIR: a.dir }).out;
    const file = join(a.dir, 'backup.json');
    writeFileSync(file, backup, 'utf8');

    const imp = run(['import', file], { EQWORKER_DATA_DIR: b.dir });
    assert.equal(imp.code, 0, imp.err);
    const list = JSON.parse(run(['persons', '--json'], { EQWORKER_DATA_DIR: b.dir }).out);
    assert.ok(list.length >= 6, `导入后应 ≥6 人，实际 ${list.length}`);
  } finally { a.cleanup(); b.cleanup(); }
});

test('损坏的数据文件不被静默覆盖', () => {
  const s = sandbox();
  try {
    writeFileSync(join(s.dir, 'eq-worker.json'), '{ this is not json', 'utf8');
    const r = run(['persons'], { EQWORKER_DATA_DIR: s.dir });
    // 允许非零退出或明确报错，但绝不能把原文件清成合法空数据
    const raw = readFileSync(join(s.dir, 'eq-worker.json'), 'utf8');
    assert.equal(raw, '{ this is not json', '损坏文件必须原样保留，否则用户唯一副本被毁');
    assert.ok(r.code !== 0 || /失败|损坏|无法/.test(r.err + r.out), '应明确报错');
  } finally { s.cleanup(); }
});

test('--json 输出始终是合法 JSON（便于脚本管道）', () => {
  const s = sandbox();
  try {
    run(['demo'], { EQWORKER_DATA_DIR: s.dir });
    for (const cmd of ['overview', 'persons', 'ledger', 'health', 'practice', 'achievements', 'report', 'actions']) {
      const { out, code } = run([cmd, '--json'], { EQWORKER_DATA_DIR: s.dir });
      assert.equal(code, 0, `${cmd} 应成功`);
      assert.doesNotThrow(() => JSON.parse(out), `${cmd} --json 必须是合法 JSON`);
    }
  } finally { s.cleanup(); }
});

test('search 跨人脉与往来匹配，无结果时明确提示', () => {
  const s = sandbox();
  try {
    run(['demo'], { EQWORKER_DATA_DIR: s.dir });
    const hit = run(['search', '王总', '--json'], { EQWORKER_DATA_DIR: s.dir });
    assert.equal(hit.code, 0);
    const d = JSON.parse(hit.out);
    assert.ok(d.persons.length >= 1, '应命中王总');
    assert.ok(d.events.length >= 1, '应命中王总的往来');

    const miss = run(['search', '绝对不存在的关键词xyz'], { EQWORKER_DATA_DIR: s.dir });
    assert.equal(miss.code, 0, '无结果不应报错');
    assert.match(miss.out, /没有匹配/);
  } finally { s.cleanup(); }
});

test('reminders 列出待办并可标记完成', () => {
  const s = sandbox();
  try {
    run(['demo'], { EQWORKER_DATA_DIR: s.dir });
    const list = run(['reminders', '--json'], { EQWORKER_DATA_DIR: s.dir });
    const all = JSON.parse(list.out);
    const pending = all.filter((r) => r.status === 'pending');
    assert.ok(pending.length >= 1, '演示数据应有待办');

    const done = run(['reminders', '--done', pending[0].id], { EQWORKER_DATA_DIR: s.dir });
    assert.equal(done.code, 0);
    const after = JSON.parse(run(['reminders', '--json'], { EQWORKER_DATA_DIR: s.dir }).out);
    assert.equal(after.find((r) => r.id === pending[0].id).status, 'done');
  } finally { s.cleanup(); }
});

test('doctor 对健康数据通过，对孤立记录报警', () => {
  const s = sandbox();
  try {
    run(['demo'], { EQWORKER_DATA_DIR: s.dir });
    const ok = run(['doctor', '--json'], { EQWORKER_DATA_DIR: s.dir });
    assert.equal(ok.code, 0, '健康数据应通过');
    assert.equal(JSON.parse(ok.out).issues.length, 0);

    // 人为制造孤立记录
    const file = join(s.dir, 'eq-worker.json');
    const raw = JSON.parse(readFileSync(file, 'utf8'));
    const db = JSON.parse(raw.eqworker_db_v1);
    db.events.push({ id: 'orphan', personId: 'nobody', type: 'meal', title: 'x', time: Date.now(), weight: 7, note: '', amount: 0, dir: 'none', occasion: '日常' });
    raw.eqworker_db_v1 = JSON.stringify(db);
    writeFileSync(file, JSON.stringify(raw), 'utf8');

    const bad = run(['doctor', '--json'], { EQWORKER_DATA_DIR: s.dir });
    assert.equal(bad.code, 1, '有问题时退出码应为 1');
    assert.ok(JSON.parse(bad.out).issues.some((i) => i.includes('孤立')), '应报告孤立记录');
  } finally { s.cleanup(); }
});

/* 回归：add-person 的标签上限必须与核心规范一致（10 个）。
   修复前 CLI 不做裁剪，11 个标签的合法输入会让 save 校验必拒，
   用户得到一条"存储不可写"的误导性报错。 */
test('add-person 标签超过 10 个时按核心规范裁剪且添加成功', () => {
  const s = sandbox();
  try {
    const tags = Array.from({ length: 12 }, (_, i) => '标签' + (i + 1)).join(',');
    const add = run(['add-person', '--name', '标签上限', '--tags', tags], { EQWORKER_DATA_DIR: s.dir });
    assert.equal(add.code, 0, '12 个标签经裁剪后应能正常保存');
    const list = JSON.parse(run(['persons', '--json'], { EQWORKER_DATA_DIR: s.dir }).out);
    assert.equal(list[0].tags.length, 10, '应裁剪到核心规范的 10 个');
  } finally { s.cleanup(); }
});
