// EQ-Worker · 小程序入口
const engine = require('./utils/engine');

App({
  globalData: {
    state: null, // { persons, events, reminders, progress, streak }
    curPersonId: null
  },
  onLaunch() {
    this.globalData.state = engine.load();
  },
  save() {
    engine.save(this.globalData.state);
  }
});
