// EQ-Worker · 小程序入口
const engine = require('./utils/engine');

App({
  globalData: {
    state: null, // { persons, events, reminders, progress, streak }
    curPersonId: null
  },
  onLaunch() {
    this.globalData.state = engine.load();
    if (engine.isWriteProtected()) wx.showModal({ title: '数据保护提示', content: '本地数据异常或备份失败，已开启写保护。请保留原数据，暂勿清除小程序缓存。', showCancel: false });
  },
  save() {
    return engine.save(this.globalData.state);
  }
});
