const engine = require('../../utils/engine');
const ui = require('../../utils/ui');

/* 话术参谋：覆盖常见场景，给稳妥/亲近/简短三种语气，可一键复制。
   文本全部来自 core 的 buildScripts，本页只做选择与展示。 */
Page({
  data: {
    scenes: [],
    sceneIdx: 0,
    persons: [{ id: '', name: '不指定（通用话术）', identity: '' }],
    personIdx: 0,
    context: '',
    result: null,
    _modal: { show: false, anim: '' },
    _toast: { show: false, anim: '' }
  },
  onLoad() {
    const scenes = (engine.SCRIPT_SCENES || []).map(s => ({ id: s.id, label: s.label, hint: s.hint }));
    this.setData({ scenes });
  },
  onShow() {
    const S = engine.getState();
    const persons = [{ id: '', name: '不指定（通用话术）', identity: '' }]
      .concat(S.persons.map(p => ({ id: p.id, name: p.name, identity: p.identity || '' })));
    let idx = this.data.personIdx;
    if (idx >= persons.length) idx = 0;
    this.setData({ persons, personIdx: idx }, () => this.compute());
  },
  compute() {
    const { scenes, sceneIdx, persons, personIdx, context } = this.data;
    if (!scenes.length) return;
    const sceneId = scenes[sceneIdx].id;
    const personId = persons[personIdx] ? persons[personIdx].id : '';
    const r = engine.buildScripts(sceneId, personId, context || '');
    if (!r) { this.setData({ result: null }); return; }
    this.setData({
      result: {
        sceneLabel: r.scene.label,
        sceneHint: r.scene.hint,
        personName: r.person ? r.person.name : '',
        variants: (r.variants || []).map(v => ({ tone: v.tone, text: v.text }))
      }
    });
  },
  onSceneChange(e) { this.setData({ sceneIdx: +e.detail.value }, () => this.compute()); },
  onPersonChange(e) { this.setData({ personIdx: +e.detail.value }, () => this.compute()); },
  onContext(e) { this.setData({ context: e.detail.value }); },
  onContextBlur() { this.compute(); },
  copy(e) {
    const text = e.currentTarget.dataset.text;
    if (!text) return;
    wx.setClipboardData({
      data: text,
      success: () => ui.toast(this, '已复制，可粘贴后微调', { icon: '✓' })
    });
  },
  noop() {},
  onModalConfirm() { ui.modalClose(this, true); },
  onModalCancel() { ui.modalClose(this, false); },
  onModalInput(e) { ui.modalInput(this, e); }
});
