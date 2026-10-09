const engine = require('../../utils/engine');
const ui = require('../../utils/ui');

Page({
  data: {
    stats: [],
    reminders: [],
    month: null,
    trend: [],
    trendMax: 1,
    dims: [], dimRows: [], w: 0, levelName: '',
    top3: [],
    report: null,
    showReport: false,
    showImport: false,
    importText: '',
    version: 'v2.8',
    _modal: { show: false, anim: '' },
    _toast: { show: false, anim: '' }
  },
  onShow() {
    const S = engine.getState();
    const m = engine.overallMetrics();
    const w = engine.getWisdom();
    const lv = engine.getLevel(w);
    const stats = [
      { n: S.persons.length, l: '人脉' },
      { n: S.events.length, l: '往来记录' },
      { n: S.reminders.filter(r => r.status === 'pending').length, l: '待办' },
      { n: w, l: '智慧值' }
    ];
    const reminders = S.reminders
      .filter(r => r.status === 'pending')
      .sort((a, b) => (a.date || '9999') < (b.date || '9999') ? -1 : 1)
      .map(r => {
        const p = S.persons.find(x => x.id === r.personId);
        return { id: r.id, content: r.content, person: p ? p.name : '', date: r.date || '随时', due: r.date ? (r.date < engine.todayStr() ? '已到期' : r.date) : '' };
      });
    const month = engine.monthData();
    const trend = engine.trendData(6);
    const labels = ['人脉规模', '人情热度', '往来频率', '人情信用', '处世智慧'];
    const vals = m ? [m.scale, Math.round(m.heatAvg), m.freq, Math.round(m.credit), m.wisdom] : [0, 0, 0, 0, 0];
    const dimRows = labels.map((l, i) => ({ n: l, v: vals[i] }));
    const top3 = S.persons.map(p => ({ p, h: engine.computePerson(p) }))
      .sort((a, b) => b.h.heat - a.h.heat).slice(0, 3)
      .map(x => ({
        id: x.p.id, name: x.p.name, identity: x.p.identity || '朋友',
        tags: (x.p.tags || []).slice(0, 2),
        heat: Math.round(x.h.heat),
        last: x.h.lastDays === null ? '尚无往来' : engine.timeAgo(
          S.events.filter(e => e.personId === x.p.id).reduce((mx, e) => Math.max(mx, e.time), 0))
      }));
    this.setData({
      stats, reminders, month,
      trend: trend.map(t => ({ label: t.label, c: t.c })),
      trendMax: Math.max.apply(null, trend.map(t => t.c).concat([1])),
      dims: labels, dimRows, w, levelName: lv.cur.name,
      top3
    });
  },
  openDetail(e) { wx.navigateTo({ url: '/pages/detail/detail?id=' + e.currentTarget.dataset.id }); },
  quickDone(e) {
    const S = engine.getState();
    const id = e.currentTarget.dataset.id;
    const r = S.reminders.find(x => x.id === id);
    if (r) { r.status = 'done'; engine.save(); this.onShow(); ui.toast(this, '已完成', { icon: '✓' }); }
  },
  /* ── UI handlers ── */
  onModalConfirm() { ui.modalClose(this, true); },
  onModalCancel() { ui.modalClose(this, false); },
  onModalInput(e) { ui.modalInput(this, e); },
  noop() {},
  delReminder(e) {
    const S = engine.getState();
    const id = e.currentTarget.dataset.id;
    ui.confirm(this, '删除这条提醒？', '', () => {
      S.reminders = S.reminders.filter(x => x.id !== id);
      engine.save();
      this.onShow();
    }, true);
  },
  addReminder() {
    const S = engine.getState();
    const persons = S.persons;
    const names = persons.map(p => p.name);
    let idx = 0;
    wx.showActionSheet({
      itemList: persons.length ? names : ['先添加人脉'],
      success: (r) => {
        if (!persons.length) return;
        idx = r.tapIndex;
        ui.modal(this, {
          title: '添加待办提醒',
          placeholder: '如：下周约' + persons[idx].name + '吃个饭',
          editable: true,
          confirmText: '添加',
          confirmType: 'teal',
          onConfirm: (val) => {
            if (val && val.trim()) {
              S.reminders.push({ id: engine.uid(), personId: persons[idx].id, content: val.trim(), date: '', status: 'pending' });
              engine.save();
              this.onShow();
              ui.toast(this, '已添加提醒', { icon: '✓' });
            }
          }
        });
      }
    });
  },
  openReport() {
    const d = engine.annualData();
    const peak = d.peak;
    this.setData({
      showReport: true,
      report: {
        total: d.total,
        top: d.top,
        debts: d.debts,
        w: d.w, levelName: d.levelName,
        bestM: d.bestM, peak,
        kw: d.kw,
        months: d.months.map(x => ({ label: x.label, c: x.c, h: Math.max(6, Math.round(x.c / peak * 120)) }))
      }
    });
  },
  closeReport() { this.setData({ showReport: false }); },
  copyBackup() {
    const S = engine.getState();
    const p = S.persons.length, e = S.events.length;
    wx.setClipboardData({
      data: engine.backupText(),
      success: () => ui.toast(this, '已复制 ' + p + ' 人 / ' + e + ' 笔数据')
    });
  },
  openImport() { this.setData({ showImport: true, importText: '' }); },
  closeImport() { this.setData({ showImport: false }); },
  onImport(e) { this.setData({ importText: e.detail.value }); },
  doImport() {
    const txt = this.data.importText.trim();
    if (!txt) { ui.toast(this, '先粘贴备份内容', { icon: '✕' }); return; }
    try {
      engine.restoreText(txt);
      this.setData({ showImport: false });
      this.onShow();
      ui.toast(this, '导入成功', { icon: '✓' });
    } catch (err) {
      ui.toast(this, '导入失败：格式不对', { icon: '✕' });
    }
  },
  clearAll() {
    ui.confirm(this, '清空所有数据？', '所有记录将永久删除，不可恢复。建议先「复制备份」。', () => {
      const S = engine.getState();
      S.persons = []; S.events = []; S.reminders = []; S.progress = {}; S.streak = { n: 0, last: '' };
      engine.save();
      this.onShow();
    }, true);
  }
});
