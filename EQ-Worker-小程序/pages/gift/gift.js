const engine = require('../../utils/engine');
const ui = require('../../utils/ui');

/* 随礼参谋：关系 × 场合 × 档位 × 城市 给出三档金额参考。
   计算全部来自 core 的 giftAdvice，本页只做选择与展示。 */
const OCCASIONS = ['日常', '生日', '婚礼', '满月', '乔迁', '探病', '节日', '还礼', '其他'];
const TIERS = [
  { key: 'simple', label: '从简' },
  { key: 'standard', label: '得体' },
  { key: 'generous', label: '重视' }
];
const CITIES = ['三线', '二线', '一线'];

Page({
  data: {
    persons: [],
    personIdx: 0,
    occasions: OCCASIONS,
    occIdx: 2,
    tiers: TIERS,
    tierKey: 'standard',
    cities: CITIES,
    cityIdx: 1,
    advice: null,
    hasData: false,
    _modal: { show: false, anim: '' },
    _toast: { show: false, anim: '' }
  },
  onShow() {
    const S = engine.getState();
    const persons = S.persons.map(p => ({ id: p.id, name: p.name, identity: p.identity || '' }));
    const st = S.settings || {};
    const tierKey = st.giftTier && TIERS.some(t => t.key === st.giftTier) ? st.giftTier : this.data.tierKey;
    const cityIdx = CITIES.indexOf(st.cityTier) >= 0 ? CITIES.indexOf(st.cityTier) : this.data.cityIdx;
    let idx = this.data.personIdx;
    if (idx >= persons.length) idx = 0;
    this.setData({ persons, personIdx: idx, hasData: persons.length > 0, tierKey, cityIdx }, () => this.compute());
  },
  compute() {
    const { persons, personIdx, occasions, occIdx, tierKey, cities, cityIdx } = this.data;
    if (!persons.length) { this.setData({ advice: null }); return; }
    const personId = persons[personIdx].id;
    const occasion = occasions[occIdx];
    const a = engine.giftAdvice(personId, occasion, { tier: tierKey, city: cities[cityIdx] });
    if (!a) { this.setData({ advice: null }); return; }
    this.setData({
      advice: {
        low: engine.fmtMoney(a.low),
        mid: engine.fmtMoney(a.mid),
        high: engine.fmtMoney(a.high),
        identity: a.identity,
        occasion: a.occasion,
        tier: a.tier,
        city: a.city,
        reasons: a.reasons || [],
        note: a.note || '',
        net: engine.personLedger(personId).net
      }
    });
  },
  onPersonChange(e) { this.setData({ personIdx: +e.detail.value }, () => this.compute()); },
  onOccChange(e) { this.setData({ occIdx: +e.detail.value }, () => this.compute()); },
  onTier(e) { this.setData({ tierKey: e.currentTarget.dataset.k }, () => this.compute()); },
  onCityChange(e) { this.setData({ cityIdx: +e.detail.value }, () => this.compute()); },
  goRecord() {
    wx.switchTab({ url: '/pages/record/record' });
  },
  noop() {},
  onModalConfirm() { ui.modalClose(this, true); },
  onModalCancel() { ui.modalClose(this, false); },
  onModalInput(e) { ui.modalInput(this, e); }
});
