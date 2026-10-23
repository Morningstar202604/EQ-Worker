// 雷达图绘制（canvas 2d，无第三方依赖）
// 五边形网格 + 数据多边形，配色与日记本设计系统一致
const GRID = ['rgba(185,164,128,.35)', 'rgba(185,164,128,.35)', 'rgba(185,164,128,.35)', 'rgba(185,164,128,.35)', 'rgba(185,164,128,.35)'];
const FILL = 'rgba(95,133,117,.20)';
const STROKE = '#5f8575';

function drawRadar(selector, dims, values, cb) {
  wx.createSelectorQuery().select(selector).fields({ node: true, size: true }).exec((res) => {
    if (!res || !res[0] || !res[0].node) { if (cb) cb(); return; }
    const canvas = res[0].node;
    const w = res[0].width, h = res[0].height;
    const dpr = (wx.getWindowInfo ? wx.getWindowInfo().pixelRatio : wx.getSystemInfoSync().pixelRatio) || 2;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 14;
    const N = dims.length;
    const angle = (i) => -Math.PI / 2 + (i * 2 * Math.PI) / N;
    const pt = (i, r) => [cx + r * Math.cos(angle(i)), cy + r * Math.sin(angle(i))];

    // 网格：5 层
    for (let layer = 1; layer <= 5; layer++) {
      const r = (R * layer) / 5;
      ctx.beginPath();
      for (let i = 0; i < N; i++) {
        const [x, y] = pt(i, r);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = GRID[layer % GRID.length];
      ctx.lineWidth = layer === 5 ? 1.4 : 1;
      ctx.stroke();
    }
    // 辐条
    for (let i = 0; i < N; i++) {
      const [x, y] = pt(i, R);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x, y);
      ctx.strokeStyle = 'rgba(185,164,128,.35)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    // 数据多边形
    ctx.beginPath();
    for (let i = 0; i < N; i++) {
      const r = (R * Math.max(0, Math.min(100, values[i] || 0))) / 100;
      const [x, y] = pt(i, r);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = FILL;
    ctx.fill();
    ctx.strokeStyle = STROKE;
    ctx.lineWidth = 2;
    ctx.stroke();
    // 顶点圆点
    for (let i = 0; i < N; i++) {
      const r = (R * Math.max(0, Math.min(100, values[i] || 0))) / 100;
      const [x, y] = pt(i, r);
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#5f8575';
      ctx.fill();
    }
    // 维度标签
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#7d7263';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < N; i++) {
      const [x, y] = pt(i, R + 13);
      ctx.fillText(dims[i], x, y);
    }
    if (cb) cb();
  });
}

module.exports = { drawRadar };
