const engine = require('../../utils/engine');
const ui = require('../../utils/ui');

Page({
  data: { sc: null, pick: -1, _modal: { show: false, anim: '' }, _toast: { show: false, anim: '' } },
  onLoad(q) {
    const id = q.id;
    const sc = engine.SCENARIOS.find(x => x.id === id) || engine.SCENARIOS[0];
    const diff = engine.DIFFS[sc.diff] || engine.DIFFS['入门'];
    this.setData({
      sc: {
        id: sc.id, title: sc.title, scene: sc.scene,
        choices: sc.choices, tag: sc.tag, diff: sc.diff, chip: diff.chip, w: diff.w, tip: sc.tip
      }
    });
  },
  choose(e) {
    const i = +e.currentTarget.dataset.i;
    this.setData({ pick: i });
  },
  /* ── UI handlers ── */
  onModalConfirm() { ui.modalClose(this, true); },
  onModalCancel() { ui.modalClose(this, false); },
  onModalInput(e) { ui.modalInput(this, e); },
  noop() {},
  confirm() {
    const pick = this.data.pick;
    if (pick < 0) { ui.toast(this, '先选一个答案', { icon: '×' }); return; }
    const S = engine.getState();
    const sc = this.data.sc;
    const opt = sc.choices[pick];
    const base = opt.s;
    const gained = Math.round(base * sc.w);
    const pre = engine.getWisdom();
    const pr = S.progress[sc.id] || { best: 0, times: 0 };
    if (base > pr.best) S.progress[sc.id] = { best: base, times: pr.times + 1 };
    const todayStr = engine.todayStr();
    const sk = S.streak || { n: 0, last: '' };
    if (sk.last !== todayStr) {
      if (sk.last === engine.fmtDate(Date.now() - engine.DAY)) sk.n += 1;
      else sk.n = 1;
      sk.last = todayStr;
    }
    S.streak = sk;
    engine.save();
    const after = engine.getWisdom();
    const lv = engine.getLevel(after);
    ui.modal(this, {
      title: opt.t,
      content: (opt.r || '') + '\n\n' + (sc.tip ? '小贴士：' + sc.tip + '\n\n' : '') + '本局得分 ' + base + '，难度加成 ×' + sc.w + '，智慧值 +' + gained + '（' + pre + ' → ' + after + '）\n当前段位：' + lv.cur.name,
      confirmText: '再练一个',
      confirmType: 'teal',
      cancelText: '返回修炼场',
      onConfirm: () => {
        const list = engine.SCENARIOS;
        const idx = list.findIndex(x => x.id === sc.id);
        wx.redirectTo({ url: '/pages/scenario/scenario?id=' + list[(idx + 1) % list.length].id });
      },
      onCancel: () => { wx.navigateBack(); }
    });
  }
});
