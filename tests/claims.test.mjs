import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * 声称一致性门禁。
 *
 * 背景：2026-11-07 的全量功能核查发现，README 声称 20 个话术场景、实际只有 18 个；
 * Windows 下载名还停在 3.6.0；MCP 工具描述写 16 个场景；官网写 16 个。
 * 这些都不是功能缺陷，但会让用户按错误信息做判断，属于「真实性」问题。
 *
 * 这里把每条声称直接锚定到源码或 package.json，任何一处漂移都会在 verify 里变红。
 */
const ROOT = resolve(import.meta.dirname, '..');
const read = (p) => readFileSync(resolve(ROOT, p), 'utf8');

function sceneCount() {
  const src = read('packages/core/src/scripts.ts');
  const m = src.match(/export const SCRIPT_SCENES[^=]*=\s*\[([\s\S]*?)\n\];/);
  assert.ok(m, 'SCRIPT_SCENES 数组应可解析');
  return (m[1].match(/\bid:\s*['"]/g) ?? []).length;
}

/** 去掉 fenced code block，避免把示例代码里的中文常量当成叙述文字。 */
function prose(md) {
  return md.replace(/```[\s\S]*?```/g, '');
}

test('对外声称与源码实现一致（场景数、版本、AI 边界、英文版语言）', () => {
  const scenes = sceneCount();
  assert.ok(scenes >= 18, `话术场景数异常：${scenes}`);
  const version = JSON.parse(read('package.json')).version;
  const en = read('README.md');
  const zh = read('README.zh.md');
  const site = read('官网/EQ-Worker官网.html');
  const mcp = read('apps/mcp/src/server.ts');
  const legacy = read('_app_dev.js');

  // 1. 话术场景数：中英 README、官网硬编码统计、官网双语文案
  assert.match(zh, new RegExp(`${scenes} 个真实场景`), '中文 README 的场景数应与 SCRIPT_SCENES 一致');
  assert.match(en, new RegExp(`${scenes} real scenarios`), '英文 README 的场景数应与 SCRIPT_SCENES 一致');
  assert.match(en, new RegExp(`${scenes} scenarios × 3 tones`), '英文 README 截图说明的场景数应一致');
  assert.match(site, new RegExp(`<div class="n">${scenes}</div>`), '官网首屏统计数字应一致');
  assert.match(site, new RegExp(`— ${scenes} scenarios, 3 tones`), '官网英文文案应一致');
  assert.match(site, new RegExp(`……${scenes} 个场景`), '官网中文文案应一致');

  // 2. MCP 工具描述不能再硬编码旧数量
  assert.doesNotMatch(mcp, /覆盖 16 个常见场景/, 'MCP 描述仍写着过期的 16 个场景');
  assert.match(mcp, /SCRIPT_SCENES\.length/, 'MCP 描述应由场景数组动态生成');

  // 3. 下载文件名必须跟随 package.json 版本
  for (const [name, doc] of [['README.md', en], ['README.zh.md', zh]]) {
    assert.ok(
      doc.includes(`EQ-Worker-${version}-x64.exe`),
      `${name} 的 Windows 下载名应跟随 v${version}`
    );
  }

  // 4. AI 能力边界：文档必须写明适用范围，且主应用确实不含 AI
  assert.match(en, /contain no AI and no network calls/, '英文 README 必须声明主应用不含 AI');
  assert.match(zh, /不含 AI、不发网络请求/, '中文 README 必须声明主应用不含 AI');
  assert.doesNotMatch(legacy, /freeSearch|runTool|runAssistant/, '主应用若接入 AI，需同步更新 README 的边界说明');

  /* 5. 穷举式数字扫描：任何「N 场景 / N 个场景 / N scenarios」都必须等于真实值。
     上一条只匹配了两种固定句式，导致「20 场景 × 3 语气」这种写法漏网——
     所以这里改成扫描全部出现处，不再依赖句式假设。 */
  for (const [name, doc] of [['README.md', en], ['README.zh.md', zh], ['官网', site], ['MCP', mcp]]) {
    const claims = [
      ...doc.matchAll(/(\d+)\s*(?:个)?(?:真实)?场景/g),
      ...doc.matchAll(/(\d+)\s*scenarios?/gi)
    ];
    for (const m of claims) {
      assert.equal(
        Number(m[1]),
        scenes,
        `${name} 里出现「${m[0]}」，但源码只有 ${scenes} 个场景`
      );
    }
  }

  /* 6. 官网不得暗示主应用有 AI。
     实测官网原写「AI 默认关闭，只发送你确认过的内容」——对下载 APK 的用户不成立，
     因为单文件版没有任何 AI 代码。这里断言官网必须说明「单文件版不含 AI」。 */
  /* 逐条检查：官网里每一条提到 AI 的文案，都必须同时说明单文件版的边界。
     只做整体 contains 会被「另一条里刚好有这个词」蒙混过关——上一版就是这么漏的。 */
  /* 只检查「关于 AI 能力的叙述性承诺」——即这些 key：
     why.*（为什么可信）、priv.*（隐私）是面向用户的承诺，必须写清边界。
     apps.*（能力清单）里提到「MCP 可被 AI 客户端调用」属于技术事实，不在此列。 */
  const PROMISE_KEYS = /'(?:why|priv)\.\d+[td]':'([^']*AI[^']*)'/g;
  const aiClaims = [...site.matchAll(PROMISE_KEYS)].map((m) => m[1]);
  assert.ok(aiClaims.length > 0, '官网应有 AI 相关承诺文案');
  for (const claim of aiClaims) {
    const mentionsScope = /单文件版|single-file build/.test(claim);
    assert.ok(
      mentionsScope,
      `官网这条 AI 文案没有说明单文件版边界：「${claim.slice(0, 60)}…」`
    );
  }

  // 7. 英文版 README 的叙述部分不得混入中文（语言切换标签与中文目录名除外）
  const ALLOWED_ZH = ['简体中文', '小程序']; // 「简体中文」是切换链接，「小程序」出现在目录名 EQ-Worker-小程序/
  const cleaned = ALLOWED_ZH.reduce((s, w) => s.split(w).join(''), prose(en));
  const cjk = cleaned.match(/[\u4e00-\u9fff]/g);
  assert.equal(cjk, null, `英文 README 正文不应出现中文，发现 ${cjk?.length ?? 0} 个汉字：${cjk?.join('') ?? ''}`);
});
