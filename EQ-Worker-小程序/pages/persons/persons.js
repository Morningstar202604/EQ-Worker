const engine = require('../../utils/engine');
const ui = require('../../utils/ui');

const IDENTITIES = ['全部', '领导', '同事', '客户', '朋友', '家人', '长辈', '其他'];
const SORTS = ['热度', '亲密度', '信任度', '活跃度', '最近往来'];

// 高亮分段：返回 [{text, hl}]
function seg(text, q) {
  text = String(text || '');
  if (!q) return [{ text, hl: false }];
  const kw = String(q).toLowerCase(), lo = text.toLowerCase();
  const out = []; let i = 0;
  while (i < text.length) {
    const idx = lo.indexOf(kw, i);
    if (idx === -1) { out.push({ text: text.slice(i), hl: false }); break; }
    if (idx > i) out.push({ text: text.slice(i, idx), hl: false });
    out.push({ text: text.slice(idx, idx + kw.length), hl: true });
    i = idx + kw.length;
  }
  return out;
}

Page({
  data: {
    q: '', total: 0, list: [],
    ids: IDENTITIES.map(n => ({ n, on: n === '全部' })),
    sorts: SORTS, sortIdx: 0, sortName: '热度',
    _modal: { show: false, anim: '' },
    _toast: { show: false, anim: '' }
  },
  onShow() { this.refresh(); },
  setSort(e) {
    const i = +e.currentTarget.dataset.i;
    this.setData({ sortIdx: i, sortName: SORTS[i] });
    this.refresh();
  },
  onInput(e) { this.setData({ q: e.detail.value }); this.refresh(); },
  addPerson() { wx.navigateTo({ url: '/pages/detail/detail?mode=add' }); },
  clearQ() { this.setData({ q: '' }); this.refresh(); },
  openDetail(e) { wx.navigateTo({ url: '/pages/detail/detail?id=' + e.currentTarget.dataset.id }); },
  /* ── UI handlers ── */
  onModalConfirm() { ui.modalClose(this, true); },
  onModalCancel() { ui.modalClose(this, false); },
  onModalInput(e) { ui.modalInput(this, e); },
  noop() {},
  tapIdent(e) {
    const i = +e.currentTarget.dataset.i;
    const ids = this.data.ids.map((x, j) => ({ n: x.n, on: j === i }));
    this.setData({ ids });
    this.refresh();
  },
  tapSort(e) {
    const i = +e.currentTarget.dataset.i;
    this.setData({ sortIdx: i });
    this.refresh();
  },
  refresh() {
    const S = engine.getState();
    const q = this.data.q.trim();
    const curId = this.data.ids.find(x => x.on);
    const idf = curId.n === '全部' ? '' : curId.n;
    const sortKey = ['heat', 'intimacy', 'trust', 'activity', 'lastTime'][this.data.sortIdx];
    const sortName = SORTS[this.data.sortIdx];

    /* 事件按人分组一次遍历：原来每个人都要 filter 一遍全量事件，
       人脉多时列表会卡（Web 端同样问题已一并修掉）。 */
    const evByPerson = {};
    for (const e of S.events) (evByPerson[e.personId] || (evByPerson[e.personId] = [])).push(e);

    let list = S.persons.map(p => {
      const m = engine.computePerson(p);
      const events = evByPerson[p.id] || [];
      const lastTime = events.reduce((mx, e) => Math.max(mx, e.time), 0);
      return {
        id: p.id, name: p.name, identity: p.identity || '朋友',
        tags: p.tags || [], note: p.note || '', heat: Math.round(m.heat),
        eventCount: events.length, lastText: lastTime ? engine.timeAgo(lastTime) : '尚无往来',
        debt: Math.round(m.debt),
        _heat: m.heat, _intimacy: m.intimacy, _trust: m.trust,
        _activity: m.activity, _lastTime: lastTime
      };
    });

    // 筛选
    if (idf) list = list.filter(p => p.identity === idf);
    if (q) {
      const low = q.toLowerCase();
      list = list.filter(p =>
        (p.name || '').toLowerCase().includes(low) ||
        (p.identity || '').toLowerCase().includes(low) ||
        /* p.tags 是数组，直接调 .toLowerCase() 会抛 TypeError 导致搜索一输入就崩。 */
        (Array.isArray(p.tags) ? p.tags.join('、') : (p.tags || '')).toLowerCase().includes(low) ||
        (p.note || '').toLowerCase().includes(low)
      );
    }

    // 排序
    const keyMap = { heat: '_heat', intimacy: '_intimacy', trust: '_trust', activity: '_activity', lastTime: '_lastTime' };
    const k = keyMap[sortKey] || '_heat';
    list.sort((a, b) => {
      if (sortKey === 'lastTime') return b._lastTime - a._lastTime;
      return b[k] - a[k];
    });

    // 附加高亮分段
    if (q) {
      list.forEach(p => {
        p.nameParts = seg(p.name, q);
        p.identityParts = seg(p.identity, q);
        p.tagsParts = (p.tags || []).map(t => seg(t, q));
      });
    }

    this.setData({ list, total: S.persons.length, sortName });
  }
});
