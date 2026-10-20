const engine = require('../../utils/engine');
const ui = require('../../utils/ui');
const { drawRadar } = require('../../utils/radar');

const IDENTITIES = ['领导', '同事', '客户', '朋友', '家人', '长辈', '其他'];

Page({
  data: {
    mode: 'view', // view | add | edit
    id: '',
    p: null,
    dims: [], dimRows: [], radarVals: [],
    rel: '', suggestion: '',
    timeline: [],
    form: { name: '', identityIdx: 3, birthday: '', tags: '', note: '' },
    identities: IDENTITIES,
    _modal: { show: false, anim: '' },
    _toast: { show: false, anim: '' }
  },
  onLoad(q) {
    if (q.mode === 'add') {
      this.setData({ mode: 'add' });
      wx.setNavigationBarTitle({ title: '添加人脉' });
      return;
    }
    const id = q.id;
    this.setData({ id });
    wx.setNavigationBarTitle({ title: '人脉详情' });
    this.refresh();
  },
  refresh() {
    const S = engine.getState();
    const p = S.persons.find(x => x.id === this.data.id);
    if (!p) { ui.toast(this, '该人脉不存在', { icon: '✕' }); setTimeout(() => wx.navigateBack(), 600); return; }
    const m = engine.computePerson(p);
    const labels = ['热度', '亲密度', '信任度', '活跃度', '人情债'];
    const vals = [Math.round(m.heat), Math.round(m.intimacy), Math.round(m.trust), m.activity, Math.round(m.debt)];
    const rows = labels.map((l, i) => ({ n: l, v: vals[i], neg: l === '人情债' && vals[i] > 0 }));
    const events = S.events.filter(e => e.personId === p.id).sort((a, b) => b.time - a.time);
    const timeline = events.map(e => ({
      id: e.id,
      title: e.title,
      type: (engine.EVENT_TYPES[e.type] || engine.EVENT_TYPES.other).label,
      weight: e.weight,
      timeText: engine.fmtDate(e.time),
      note: e.note || ''
    }));
    const last = events.reduce((mx, e) => Math.max(mx, e.time), 0);
    this.setData({
      p: {
        id: p.id, name: p.name, identity: p.identity || '朋友',
        tags: p.tags || [], birthday: p.birthday || '', note: p.note || '',
        heat: Math.round(m.heat), adjust: p.adjust || 0,
        lastText: last ? engine.timeAgo(last) : '尚无往来', eventCount: events.length
      },
      dims: labels, dimRows: rows, radarVals: vals,
      rel: engine.relationRead(p),
      suggestion: engine.getSuggestion(p),
      timeline
    });
    this.draw();
  },
  /* 同 index：onLoad 早于 onReady，需在节点就绪后补绘一次雷达图。 */
  onReady() { this.draw(); },
  draw() {
    if (this.data.radarVals.length) drawRadar('#pRadar', this.data.dims, this.data.radarVals);
  },
  /* ── UI handlers ── */
  onModalConfirm() { ui.modalClose(this, true); },
  onModalCancel() { ui.modalClose(this, false); },
  onModalInput(e) { ui.modalInput(this, e); },
  noop() {},
  adjust(e) {
    const d = +e.currentTarget.dataset.d;
    const S = engine.getState();
    const p = S.persons.find(x => x.id === this.data.id);
    if (!p) return;
    /* 与 Web 端一致：手动微调上限 ±30，避免单靠微调把热度拉满。 */
    p.adjust = Math.max(-30, Math.min(30, (p.adjust || 0) + d));
    engine.save();
    this.refresh();
  },
  goRecord() {
    wx.switchTab({ url: '/pages/record/record' });
  },
  delEvent(e) {
    const S = engine.getState();
    const id = e.currentTarget.dataset.id;
    ui.confirm(this, '删除这条记录？', '此操作无法撤销。', () => {
      S.events = S.events.filter(x => x.id !== id);
      engine.save();
      this.refresh();
    }, true);
  },
  openEdit() {
    const p = this.data.p;
    this.setData({
      mode: 'edit',
      form: {
        name: p.name,
        identityIdx: Math.max(0, IDENTITIES.indexOf(p.identity)),
        birthday: p.birthday ? engine.toDateInput(p.birthday) : '',
        tags: (p.tags || []).join('、'),
        note: p.note || ''
      }
    });
    wx.setNavigationBarTitle({ title: '编辑人脉' });
  },
  onName(e) { this.setData({ 'form.name': e.detail.value }); },
  onIdentity(e) { this.setData({ 'form.identityIdx': +e.detail.value }); },
  onBirthday(e) { this.setData({ 'form.birthday': e.detail.value }); },
  onTags(e) { this.setData({ 'form.tags': e.detail.value }); },
  onNote(e) { this.setData({ 'form.note': e.detail.value }); },
  savePerson() {
    const f = this.data.form;
    const name = f.name.trim();
    if (!name) { ui.toast(this, '名字不能为空', { icon: '✕' }); return; }
    const S = engine.getState();
    const tags = f.tags.split(/[、,，\s]+/).filter(Boolean).slice(0, 6);
    if (this.data.mode === 'add') {
      S.persons.push({
        id: engine.uid(), name, identity: IDENTITIES[f.identityIdx],
        birthday: engine.toMMDD(f.birthday), tags, note: f.note.trim(),
        adjust: 0, createdAt: Date.now()
      });
      engine.save();
      ui.toast(this, '已添加', { icon: '✓' });
      setTimeout(() => wx.navigateBack(), 400);
    } else {
      const p = S.persons.find(x => x.id === this.data.id);
      if (!p) return;
      p.name = name; p.identity = IDENTITIES[f.identityIdx];
      p.birthday = engine.toMMDD(f.birthday); p.tags = tags; p.note = f.note.trim();
      engine.save();
      wx.setNavigationBarTitle({ title: '人脉详情' });
      this.setData({ mode: 'view' });
      this.refresh();
    }
  },
  cancelEdit() {
    this.setData({ mode: 'view' });
    wx.setNavigationBarTitle({ title: '人脉详情' });
  },
  addReminder() {
    const S = engine.getState();
    ui.modal(this, {
      title: '添加待办提醒',
      placeholder: '如：下周约吃个饭',
      editable: true,
      confirmText: '添加',
      confirmType: 'teal',
      onConfirm: (val) => {
        if (val && val.trim()) {
          S.reminders.push({
            id: engine.uid(), personId: this.data.id,
            content: val.trim(), date: '', status: 'pending'
          });
          engine.save();
          ui.toast(this, '已添加提醒', { icon: '✓' });
        }
      }
    });
  },
  delPerson() {
    const S = engine.getState();
    ui.confirm(this, '删除这个人脉？', '其往来记录也会一并删除，且不可恢复。', () => {
      S.persons = S.persons.filter(x => x.id !== this.data.id);
      S.events = S.events.filter(x => x.personId !== this.data.id);
      S.reminders = S.reminders.filter(x => x.personId !== this.data.id);
      engine.save();
      wx.navigateBack();
    }, true);
  }
});
