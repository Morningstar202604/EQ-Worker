export function renderEmptyLanding(): string {
  return [
    '<section class="empty card" aria-labelledby="empty-title">',
    '<p class="eyebrow">EQ-Worker Studio</p>',
    '<h1 id="empty-title">把人情账，记成细水长流</h1>',
    '<p class="empty-lead">还没有任何人脉数据。可以先载入一份演示数据熟悉界面，或导入自己的 JSON 备份。</p>',
    '<div class="empty-actions">',
    '<button type="button" class="btn primary" data-act="load-demo" aria-label="载入演示数据">载入演示数据</button>',
    '<button type="button" class="btn ghost" data-act="import-trigger" aria-label="导入 JSON 文件">导入 JSON</button>',
    '</div>',
    '<dl class="empty-facts">',
    '<div><dt>演示数据</dt><dd>8 人 · 20 条往来</dd></div>',
    '<div><dt>数据存储</dt><dd>仅保存在本机浏览器</dd></div>',
    '<div><dt>AI 助手</dt><dd>默认关闭 · 不发起网络请求</dd></div>',
    '</dl>',
    '</section>'
  ].join('\n');
}
