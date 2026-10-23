const engine = require('../../utils/engine');

const DIFF_KEYS = ['全部', '入门', '进阶', '高手'];

Page({
  data: {
    w: 0, levelName: '', nextText: '', pct: 0,
    streak: 0, trainedToday: false,
    today: null,
    list: [],
    diffIdx: 0,
    diffKeys: DIFF_KEYS
  },
  onShow() {
    const S = engine.getState();
    const w = engine.getWisdom();
    const lv = engine.getLevel(w);
    const sk = S.streak || { n: 0, last: '' };
    const todayStr = engine.todayStr();
    const trainedToday = sk.last === todayStr;
    const scs = engine.SCENARIOS;
    const diff = engine.DIFFS;
    /* 与 Web 端口径保持一致：用「 Unix 天数 % 情景数 」取模。
       旧写法用 getDate()（月内日 1-31），同一天两端会指向不同情景。 */
    const todayIdx = Math.floor(Date.now() / 86400000) % scs.length;
    this._todayIdx = todayIdx;
    const today = scs[todayIdx];
    const td = diff[today.diff] || diff['入门'];
    this.setData({
      w, levelName: lv.cur.name,
      nextText: lv.nxt ? '距「' + lv.nxt.name + '」还差 ' + (lv.nxt.min - w) + ' 分' : '已达最高段位，世事洞明',
      pct: lv.pct || 100,
      streak: sk.n, trainedToday,
      today: {
        id: today.id, title: today.title, scene: today.scene,
        tag: today.tag, diff: today.diff, chip: td.chip, w: td.w
      }
    });
    this.refreshList();
  },
  refreshList() {
    const S = engine.getState();
    const diff = engine.DIFFS;
    const dk = DIFF_KEYS[this.data.diffIdx];
    /* 今日情景已在卡片里置顶展示，情景库列表里要排除它，
       否则同一道题会出现两次（Web 端也是这么处理的）。 */
    let list = engine.SCENARIOS
      .filter((_, i) => i !== this._todayIdx)
      .map(s => ({
        id: s.id, title: s.title, scene: s.scene,
        diff: s.diff, chip: (diff[s.diff] || diff['入门']).chip,
        best: (S.progress[s.id] || {}).best || 0
      }));
    if (dk !== '全部') list = list.filter(x => x.diff === dk);
    this.setData({ list });
  },
  tapDiff(e) {
    /* dataset.i 是字符串，wxml 里用 diffIdx === index（数字）严格比较，
       不转数字会导致难度 chip 高亮永不生效。 */
    this.setData({ diffIdx: parseInt(e.currentTarget.dataset.i, 10) || 0 });
    this.refreshList();
  },
  open(e) {
    wx.navigateTo({ url: '/pages/scenario/scenario?id=' + e.currentTarget.dataset.id });
  }
});
