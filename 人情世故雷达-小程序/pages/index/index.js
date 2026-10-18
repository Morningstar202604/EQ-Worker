const engine = require('../../utils/engine');
const { drawRadar } = require('../../utils/radar');

Page({
  data: {
    hasData: false,
    index: '--',
    dims: [],
    dimRows: [],
    alerts: [],
    pending: 0,
    festival: ''
  },
  onShow() {
    const S = engine.getState();
    const m = engine.overallMetrics();
    if (!m) {
      this.setData({ hasData: false, dims: [], dimRows: [], alerts: [], index: '--' });
      return;
    }
    const labels = ['人脉规模', '人情热度', '往来频率', '人情信用', '处世智慧'];
    const vals = [m.scale, Math.round(m.heatAvg), m.freq, Math.round(m.credit), m.wisdom];
    const rows = labels.map((l, i) => ({ n: l, v: vals[i] }));
    const alerts = engine.buildAlerts().map(a => ({ ...a, icon: a.icon, levelCls: ['red','amber','teal','blue'][a.level] || 'teal' }));
    this.setData({
      hasData: true,
      index: m.index,
      dims: labels,
      dimRows: rows,
      alerts,
      pending: S.reminders.filter(r => r.status === 'pending').length
    });
    this.draw();
  },
  /* 首次进入时 onShow 早于 onReady，canvas 节点尚未就绪，drawRadar 会静默返回
     → 雷达图一片空白（要切一次 tab 才画出来）。在 onReady 补绘一次。 */
  onReady() { this.draw(); },
  draw() {
    if (!this.data.hasData) return;
    const vals = this.data.dimRows.map(r => r.v);
    drawRadar('#radarCanvas', this.data.dims, vals);
  },
  goRecord() { wx.switchTab({ url: '/pages/record/record' }); },
  goTrain() { wx.switchTab({ url: '/pages/train/train' }); },
  openPerson(e) {
    const id = e.currentTarget.dataset.id;
    if (id) wx.navigateTo({ url: '/pages/detail/detail?id=' + id });
  },
  quickDone(e) {
    const id = e.currentTarget.dataset.rid;
    const S = engine.getState();
    const r = S.reminders.find(x => x.id === id);
    if (r) { r.status = 'done'; engine.save(); this.onShow(); }
  }
});
