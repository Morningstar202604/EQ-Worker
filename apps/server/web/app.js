/**
 * 后台前端：原生 ES 模块，零构建、零依赖。
 *
 * 为什么不用框架：这个后台只有 6 个视图、一张表、两个弹窗。引入 React/Vue
 * 会让产物体积翻十倍，还得维护一条构建链——对一个本地工具是净损失。
 * 需要复杂交互时再升级，不需要提前支付成本。
 */

const TOKEN_KEY = 'eqworker.admin.token';
let token = localStorage.getItem(TOKEN_KEY) || '';
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => '¥' + Math.round(Number(n) || 0).toLocaleString('zh-CN');
const num1 = (n) => { const v = Math.round((Number(n) || 0) * 10) / 10; return Number.isInteger(v) ? String(v) : v.toFixed(1); };

async function api(path, opts = {}) {
  const res = await fetch('/api' + path, {
    ...opts,
    headers: { 'authorization': 'Bearer ' + token, 'content-type': 'application/json', ...(opts.headers || {}) }
  });
  if (res.status === 401) { lock(); throw new Error('令牌无效'); }
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) throw new Error((data && data.error) || res.statusText);
  return data;
}

function lock() {
  token = '';
  localStorage.removeItem(TOKEN_KEY);
  renderGate();
}

function renderGate(msg = '') {
  $('#app').innerHTML = `
    <div class="gate">
      <h2>需要访问令牌</h2>
      <p>后台只在本机运行。启动服务的终端里会打印一串令牌，粘贴到这里即可。<br />令牌只保存在本机浏览器。</p>
      <input id="gate-token" placeholder="粘贴访问令牌" autocomplete="off" />
      <div style="margin-top:12px"><button class="primary" id="gate-go" style="width:100%">进入</button></div>
      <div class="err" id="gate-err">${esc(msg)}</div>
    </div>`;
  $('#gate-go').onclick = async () => {
    const v = $('#gate-token').value.trim();
    if (!v) return;
    token = v;
    try {
      await api('/overview');
      localStorage.setItem(TOKEN_KEY, token);
      renderApp();
    } catch {
      token = '';
      $('#gate-err').textContent = '令牌无效，请检查终端里打印的那一串';
    }
  };
  $('#gate-token').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#gate-go').click(); });
  $('#gate-token').focus();
}

// ---------------- 视图 ----------------

async function viewOverview() {
  const d = await api('/overview');
  const m = d.metrics;
  if (!m) return `<div class="card"><h3>还没有数据</h3><p class="muted">在客户端里添加第一位人脉，或从备份导入。</p></div>`;
  const stat = (label, value, hint) => `<div class="card stat"><div class="label">${esc(label)}</div><div class="value">${value}</div><div class="hint">${esc(hint || '')}</div></div>`;
  const got = d.achievements.filter((a) => a.done).length;
  return `
    <div class="grid cols-4" style="margin-bottom:14px">
      ${stat('人情指数', num1(m.index), '满分 100')}
      ${stat('人脉规模', num1(m.scale), `${d.counts.persons} 位联系人`)}
      ${stat('人情热度', num1(m.heatAvg), '平均热度')}
      ${stat('往来频率', num1(m.freq), '近 30 天活跃度')}
      ${stat('人情信用', num1(m.credit), '人情债越低越高')}
      ${stat('处世智慧', num1(m.wisdom), '修炼累积')}
      ${stat('累计给出', money(d.totals.given), `${d.counts.events} 笔往来`)}
      ${stat('账本净额', d.totals.net >= 0 ? '对方欠 ' + money(d.totals.net) : '我欠 ' + money(-d.totals.net), `我欠 ${d.totals.oweCount} 人 / 应收 ${d.totals.dueCount} 人`)}
    </div>
    <div class="grid cols-2">
      <div class="card">
        <h3>今天值得做</h3>
        <div class="list">${d.actions.length ? d.actions.map((a) => `<div class="item"><strong>${esc(a.title)}</strong><div class="muted tiny" style="margin-top:3px">${esc(a.reason)}</div></div>`).join('') : '<div class="muted">今天没有需要紧急处理的事。</div>'}</div>
      </div>
      <div class="card">
        <h3>本月与全年</h3>
        <div class="row" style="justify-content:space-between"><span class="muted">本月往来</span><strong>${d.month.count} 笔</strong></div>
        <div class="row" style="justify-content:space-between"><span class="muted">本月新增人脉</span><strong>${d.month.newPersons} 位</strong></div>
        <div class="row" style="justify-content:space-between"><span class="muted">近 12 个月</span><strong>${d.annual.total} 笔</strong></div>
        <div class="row" style="justify-content:space-between"><span class="muted">成就徽章</span><strong>${got} / ${d.achievements.length}</strong></div>
        <div style="margin-top:12px" class="annual-bars"></div>
        ${d.annual.keywords.map((k) => `<div class="muted tiny" style="margin-top:6px">· ${esc(k)}</div>`).join('')}
      </div>
    </div>
    <div class="card" style="margin-top:14px">
      <h3>近 12 个月往来</h3>
      <div class="row" style="align-items:flex-end;gap:4px;height:90px;margin-top:8px">
        ${d.annual.months.map((mo) => `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;justify-content:flex-end">
          <div style="width:60%;height:${Math.max(3, Math.round(mo.count / Math.max(1, d.annual.peak) * 64))}px;background:linear-gradient(180deg,#7da08f,#5f8575);border-radius:3px 3px 0 0"></div>
          <span class="tiny muted">${esc(mo.label)}</span></div>`).join('')}
      </div>
    </div>`;
}

async function viewPersons() {
  const d = await api('/persons');
  if (!d.persons.length) return `<div class="card"><h3>还没有人脉</h3><p class="muted">点右上角「添加人脉」开始。</p></div>`;
  const rows = d.persons.map((p) => `
    <tr>
      <td><strong>${esc(p.name)}</strong>${p.identity ? ` <span class="chip">${esc(p.identity)}</span>` : ''}</td>
      <td class="num">${num1(p.heat)}</td>
      <td class="num">${num1(p.debt)}</td>
      <td>${esc(p.netLabel)}</td>
      <td class="muted">${p.lastDays === null ? '—' : p.lastDays + ' 天前'}</td>
      <td class="muted">${p.eventCount} 笔</td>
      <td><button class="tiny" data-person="${esc(p.id)}">详情</button></td>
    </tr>`).join('');
  return `<div class="card"><h3>人脉（${d.persons.length}）</h3>
    <table><thead><tr><th>姓名</th><th class="num">热度</th><th class="num">人情债</th><th>账本净额</th><th>最后往来</th><th>往来</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

async function viewLedger() {
  const d = await api('/ledger');
  const rows = d.rows.filter((r) => r.net !== 0).map((r) => `
    <tr><td>${esc(r.name)}</td><td class="num">${money(r.given)}</td><td class="num">${money(r.received)}</td><td>${esc(r.netLabel)}</td></tr>`).join('');
  return `
    <div class="grid cols-4" style="margin-bottom:14px">
      <div class="card stat"><div class="label">累计给出</div><div class="value">${money(d.totals.given)}</div></div>
      <div class="card stat"><div class="label">累计收到</div><div class="value">${money(d.totals.received)}</div></div>
      <div class="card stat"><div class="label">本月给出</div><div class="value">${money(d.insights.monthGiven)}</div><div class="hint">${d.insights.monthCount} 笔</div></div>
      <div class="card stat"><div class="label">平均礼金</div><div class="value">${money(d.insights.avgGiven)}</div></div>
    </div>
    <div class="card"><h3>每人净额</h3>${rows ? `<table><thead><tr><th>姓名</th><th class="num">给出</th><th class="num">收到</th><th>净额</th></tr></thead><tbody>${rows}</tbody></table>` : '<p class="muted">还没有账本记录。</p>'}</div>
    ${d.insights.topOccasion ? `<div class="card" style="margin-top:14px"><h3>洞察</h3><p class="muted">最花心思的场合：<strong>${esc(d.insights.topOccasion)}</strong>（${money(d.insights.topOccasionAmount)}）</p></div>` : ''}`;
}

async function viewHealth() {
  const d = await api('/health-ranking');
  const rows = d.ranking.map((r) => `
    <tr><td>${esc(r.name)}</td><td>${esc(r.level)}</td><td class="num">${num1(r.score)}</td>
    <td><div class="bar" style="width:120px"><span style="width:${Math.min(100, r.score)}%"></span></div></td></tr>`).join('');
  return `<div class="card"><h3>关系体检（按健康度从低到高）</h3>
    <p class="muted tiny" style="margin:0 0 10px">先修最需要经营的关系。</p>
    <table><thead><tr><th>姓名</th><th>状态</th><th class="num">分数</th><th>健康度</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

async function viewAdvisors() {
  const meta = await api('/meta');
  const persons = await api('/persons');
  const opts = persons.persons.map((p) => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');
  return `
    <div class="grid cols-2">
      <div class="card">
        <h3>随礼参谋</h3>
        <div class="dlg-body" style="padding:0">
          <label>给谁<select id="g-person"><option value="">通用（不指定）</option>${opts}</select></label>
          <label>场合<select id="g-occasion">${meta.occasions.map((o) => `<option ${o === '婚礼' ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></label>
          <label>档位<select id="g-tier"><option value="simple">从简</option><option value="standard" selected>得体</option><option value="generous">重视</option></select></label>
          <label>城市<select id="g-city"><option>三线</option><option selected>二线</option><option>一线</option></select></label>
        </div>
        <div id="g-out" style="margin-top:12px"></div>
      </div>
      <div class="card">
        <h3>话术参谋</h3>
        <div class="dlg-body" style="padding:0">
          <label>场景<select id="s-scene">${meta.scenes.map((s) => `<option value="${esc(s.id)}">${esc(s.label)}</option>`).join('')}</select></label>
          <label>对谁说<select id="s-person"><option value="">不指定</option>${opts}</select></label>
          <label>补充背景<input id="s-context" placeholder="例如：上次他帮我搬过家" /></label>
        </div>
        <div id="s-out" style="margin-top:12px"></div>
      </div>
    </div>`;
}

async function viewDoctor() {
  const d = await api('/doctor');
  const stat = (k, v) => `<div class="card stat"><div class="label">${esc(k)}</div><div class="value">${v}</div></div>`;
  return `
    <div class="grid cols-4" style="margin-bottom:14px">
      ${stat('人脉', d.stats.persons)}
      ${stat('往来', d.stats.events)}
      ${stat('提醒', d.stats.reminders)}
      ${stat('写保护', d.writeProtected ? '是' : '否')}
    </div>
    <div class="card">
      <h3>${d.ok ? '数据检查通过' : '发现 ' + d.issues.length + ' 个问题'}</h3>
      ${d.ok
        ? '<p class="muted">孤立记录、重复 id、非法金额、生日格式与未来时间均未检出异常。</p>'
        : `<ul style="margin:8px 0 0;padding-left:18px;line-height:1.9">${d.issues.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`}
      <p class="muted tiny" style="margin-top:12px">数据文件：${esc(d.dataFile)}</p>
    </div>`;
}

const VIEWS = {
  overview: ['概览', viewOverview],
  persons: ['人脉', viewPersons],
  ledger: ['账本', viewLedger],
  health: ['关系体检', viewHealth],
  advisors: ['参谋', viewAdvisors],
  doctor: ['数据体检', viewDoctor]
};
let current = 'overview';

async function renderApp() {
  const tabs = Object.entries(VIEWS).map(([k, [label]]) => `<button data-view="${k}" class="${k === current ? 'on' : ''}">${label}</button>`).join('');
  $('#app').innerHTML = `<div class="tabs">${tabs}</div><div id="view"><div class="muted">加载中…</div></div>`;
  $$('[data-view]').forEach((b) => { b.onclick = () => { current = b.dataset.view; renderApp(); }; });
  try {
    $('#view').innerHTML = await VIEWS[current][1]();
    bindView();
  } catch (e) {
    $('#view').innerHTML = `<div class="card"><h3>加载失败</h3><p class="err">${esc(e.message)}</p></div>`;
  }
}

function bindView() {
  $$('[data-person]').forEach((b) => {
    b.onclick = async () => {
      const d = await api('/persons/' + encodeURIComponent(b.dataset.person));
      alert([d.person.name, `${d.person.identity || ''}`, `热度 ${num1(d.computed.heat)} / 信任 ${num1(d.computed.trust)} / 亲密 ${num1(d.computed.intimacy)}`, `账本：${d.ledger.net >= 0 ? '对方欠 ' + money(d.ledger.net) : '我欠 ' + money(-d.ledger.net)}`, '', ...d.events.slice(0, 8).map((e) => `${e.dateText}  ${e.typeLabel}  ${e.title}`)].join('\n'));
    };
  });
  const gBtn = $('#g-person');
  if (gBtn) {
    const run = async () => {
      const q = new URLSearchParams({ personId: $('#g-person').value, occasion: $('#g-occasion').value, tier: $('#g-tier').value, city: $('#g-city').value });
      const a = await api('/gift?' + q);
      $('#g-out').innerHTML = `<div class="row" style="justify-content:space-between"><span class="muted">从简</span><strong>${money(a.low)}</strong></div>
        <div class="row" style="justify-content:space-between;color:var(--teal)"><span>建议</span><strong style="font-size:20px">${money(a.mid)}</strong></div>
        <div class="row" style="justify-content:space-between"><span class="muted">重视</span><strong>${money(a.high)}</strong></div>
        <div class="muted tiny" style="margin-top:8px">${a.reasons.map((r) => '· ' + esc(r)).join('<br />')}</div>`;
    };
    ['#g-person', '#g-occasion', '#g-tier', '#g-city'].forEach((s) => { $(s).onchange = run; });
    run();
    const sRun = async () => {
      const q = new URLSearchParams({ scene: $('#s-scene').value, personId: $('#s-person').value, context: $('#s-context').value });
      const r = await api('/script?' + q);
      $('#s-out').innerHTML = r.variants.map((v) => `<div class="item" style="margin-bottom:8px"><div class="chip">${esc(v.tone)}</div><div style="margin-top:6px;line-height:1.7">${esc(v.text)}</div><button class="tiny" style="margin-top:6px" data-copy="${esc(v.text)}">复制</button></div>`).join('');
      $$('[data-copy]').forEach((b) => { b.onclick = () => navigator.clipboard.writeText(b.dataset.copy); });
    };
    ['#s-scene', '#s-person'].forEach((s) => { $(s).onchange = sRun; });
    $('#s-context').oninput = () => { clearTimeout(window.__st); window.__st = setTimeout(sRun, 400); };
    sRun();
  }
}

// ---------------- 启动 ----------------

async function boot() {
  $('#btn-lock').onclick = lock;
  $('#btn-export').onclick = () => { window.open('/api/export?token=' + encodeURIComponent(token), '_blank'); };
  $('#btn-add-person').onclick = async () => {
    const meta = await api('/meta');
    const sel = $('#f-identity');
    sel.innerHTML = ['领导', '同事', '客户', '朋友', '家人', '长辈', '同学', '邻居', '其他'].map((x) => `<option>${x}</option>`).join('');
    $('#person-err').textContent = '';
    $('#dlg-person').showModal();
    void meta;
  };
  $$('[data-close]').forEach((b) => { b.onclick = () => b.closest('dialog').close(); });

  $('#btn-save-person').onclick = async () => {
    const name = $('#f-name').value.trim();
    if (!name) { $('#person-err').textContent = '姓名不能为空'; return; }
    try {
      await api('/persons', { method: 'POST', body: JSON.stringify({
        name, identity: $('#f-identity').value, tags: $('#f-tags').value.split(',').map((s) => s.trim()).filter(Boolean),
        birthday: $('#f-birthday').value.trim(), note: $('#f-note').value.trim()
      }) });
      $('#dlg-person').close();
      $('#f-name').value = ''; $('#f-tags').value = ''; $('#f-birthday').value = ''; $('#f-note').value = '';
      renderApp();
    } catch (e) { $('#person-err').textContent = e.message; }
  };

  if (!token) { renderGate(); return; }
  try { await api('/overview'); renderApp(); } catch { renderGate(); }
}

boot();
