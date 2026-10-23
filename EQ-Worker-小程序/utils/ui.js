// EQ-Worker · 小程序 UI 组件控制器
// 统一接管 wx.showModal / wx.showToast，提供自定义动效 modal + toast
// 用法：在 Page 中 require 后调用 ui.toast / ui.modal / ui.modalClose / ui.modalInput
const DURATION = 220; // 动效毫秒

/* 页面可能已被销毁（navigateBack / switchTab / 关闭），此时 setData 会抛异常并中断
   后续逻辑（尤其是 toast/modal 的延时回调里）。统一兜底，避免控制台报错与状态错乱。 */
function safeSet(page, data) {
  try { page.setData(data); } catch (e) {}
}

/* ───────── Toast ───────── */
function toast(page, msg, opts) {
  opts = opts || {};
  /* 两个定时器都要记录：旧的只清了外层，内层仍会在页面销毁后触发 setData。 */
  if (page.__toastTimer) clearTimeout(page.__toastTimer);
  if (page.__toastTimer2) clearTimeout(page.__toastTimer2);
  safeSet(page, {
    _toast: { show: true, msg: msg, icon: opts.icon || '', anim: 'toast-in', mode: opts.mode || 'dark' }
  });
  const dur = opts.duration || (msg.length > 10 ? 2200 : 1500);
  page.__toastTimer = setTimeout(function () {
    safeSet(page, { '_toast.anim': 'toast-out' });
    page.__toastTimer2 = setTimeout(function () { safeSet(page, { '_toast.show': false }); }, DURATION);
  }, dur);
}

/* ───────── Modal ───────── */
function modal(page, cfg) {
  page._modalCb = { confirm: cfg.onConfirm, cancel: cfg.onCancel, input: cfg.onInput };
  safeSet(page, {
    _modal: {
      show: true,
      title: cfg.title || '',
      msg: cfg.content || cfg.message || '',
      confirmText: cfg.confirmText || '确定',
      confirmType: cfg.confirmType || 'teal',
      cancelText: cfg.cancelText || '取消',
      editable: !!cfg.editable,
      placeholder: cfg.placeholder || '',
      inputVal: '',
      danger: !!cfg.danger,
      anim: 'modal-in'
    }
  });
}

function modalClose(page, confirmed) {
  var m = page.data._modal;
  var cb = confirmed ? (page._modalCb && page._modalCb.confirm) : (page._modalCb && page._modalCb.cancel);
  // 编辑模式下 confirm 把内容传给回调
  safeSet(page, { '_modal.anim': 'modal-out' });
  setTimeout(function () {
    safeSet(page, { '_modal.show': false });
    if (cb) cb(confirmed && m.editable ? m.inputVal : undefined);
  }, DURATION);
}

function modalInput(page, e) {
  var v = e.detail.value;
  safeSet(page, { '_modal.inputVal': v });
  if (page._modalCb && typeof page._modalCb.input === 'function') page._modalCb.input(v);
}

/* ───────── 搜索高亮辅助 ───────── */
// 把文本按关键词分段，返回 [{text, hl}] 数组
function highlightSegments(text, keyword) {
  text = String(text || '');
  if (!keyword) return [{ text: text, hl: false }];
  var kw = String(keyword).toLowerCase();
  var lowerText = text.toLowerCase();
  var segments = [];
  var i = 0;
  while (i < text.length) {
    var idx = lowerText.indexOf(kw, i);
    if (idx === -1) {
      segments.push({ text: text.slice(i), hl: false });
      break;
    }
    if (idx > i) segments.push({ text: text.slice(i, idx), hl: false });
    segments.push({ text: text.slice(idx, idx + kw.length), hl: true });
    i = idx + kw.length;
  }
  return segments;
}

/* ───────── 轻量 confirm 快捷方法 ───────── */
function confirm(page, title, message, onConfirm, danger) {
  modal(page, {
    title: title,
    content: message,
    confirmText: danger ? '删除' : '确定',
    confirmType: danger ? 'danger' : 'teal',
    cancelText: '取消',
    danger: !!danger,
    onConfirm: onConfirm
  });
}

module.exports = {
  toast: toast,
  modal: modal,
  modalClose: modalClose,
  modalInput: modalInput,
  confirm: confirm,
  highlightSegments: highlightSegments,
  DURATION: DURATION
};
