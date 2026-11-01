# AI 编排骨架与流水线（S6 / S7）

本地优先的 AI 层：默认关闭、端侧直连、用户自备 Key、发送前预览放行。本包不含任何服务器、埋点或遥测代码。

## 目录

```
packages/ai/
├── src/
│   ├── types.ts               ProviderConfig / ChatMessage / AIProvider / AIRequest / AIResponse
│   │                          ContextPolicy / PersonContext / PipelineStep / PipelineResult / AIError
│   ├── provider.ts            createProvider 工厂 + 错误归一化（toAIError）
│   ├── providers/openai.ts    OpenAI 兼容（/chat/completions，baseUrl 可换成 Ollama / LM Studio / DeepSeek）
│   ├── providers/anthropic.ts Anthropic Messages API（/v1/messages）
│   ├── providers/mock.ts      可编程假 provider
│   ├── context.ts             buildPersonContext + redactPreview + PII 默认白名单
│   ├── pipeline.ts            runPipeline 声明式编排（每步超时 / optional 跳过 / 必需失败降级）
│   ├── pipelines.ts           内置四步流水线 + JSON 协议解析
│   ├── memory.ts              MemoryStore（按 personId 隔离，最近 N 轮 + 摘要，可清除 / 导出）
│   ├── settings.ts            AISettings 默认值 / 校验 / 序列化（不含 Key）
│   ├── fallback.ts            FallbackChain（无 Key / 无网 / 超时 → 规则函数）
│   └── index.ts               公共出口
└── tests/                     provider / context / pipeline / disabled / memory / fallback / settings / redlines
```

## 红线落点

| 红线 | 代码 | 测试 |
| --- | --- | --- |
| AI 默认关闭 | `settings.ts` `defaultAISettings().enabled=false`；`pipeline.ts` 在取 provider 之前返回 `reason:'disabled'` | `disabled.test.ts` 用计数 fetch 断言 0 次，并额外断言开启路径确实会 fetch（证明 0 不是空跑） |
| 用户自备 Key，不进 config | `ProviderConfig` 无 key 字段；`createProvider(cfg, { apiKey })` 单独传参 | `provider.test.ts`、`settings.test.ts` |
| 端侧直连 | provider 只用注入的 `fetchImpl`，无任何后台地址 | `provider.test.ts` 捕获 URL 断言 |
| Key 不入日志/错误/导出 | `provider.ts`、`context.ts` 脱敏；`settings.serializeAISettings` 只输出白名单字段；`memory.export` 二次 scrub | `provider.test.ts`、`settings.test.ts`、`memory.test.ts`、`redlines.test.ts` |
| PII 白名单 + 预览放行 | `DEFAULT_CONTEXT_POLICY` 全 false（events 除外）；`runPipeline` 返回 `preview`；`previewBeforeSend` 默认 true 时未 approved 直接 `approval_required` | `context.test.ts`、`redlines.test.ts`、`pipeline.test.ts` |
| 无埋点 | 全包无 `console.*` / 无上报调用 | 代码扫描 |

## 内置流水线

`scene_detect → script_generate → gift_advice → review`

- `scene_detect`：输出 `{ sceneId }`，场景 ID 与主应用 `SCRIPT_SCENES` 对齐。
- `script_generate`：输出三语气 `{ variants: { stable, close, brief } }`。
- `gift_advice`：输出 `{ low, mid, high, currency:'CNY', reasons }`，断言 `low <= mid <= high`。
- `review`：输出三条 `tips`。

模型返回非 JSON / 缺字段 / 数值越界 → `invalid_response`，按 `optional` 与否走跳过或整链降级。

## 使用

```ts
const settings = { ...defaultAISettings(), enabled: true, provider: providerConfig };
const deps = {
  settings,
  apiKey,
  fetchImpl: window.fetch.bind(window),
  fallback: createFallbackHandler(new FallbackChain())
};
const result = await runPipeline(builtinPipeline, pipelineContext, deps);
if (result.reason === 'approval_required' && result.preview) {
  const approved = await confirmPreview(result.preview);
  if (approved) {
    await runPipeline(builtinPipeline, { ...pipelineContext, approved: true }, {
      ...deps,
      approvedPreview: result.preview
    });
  }
}
```

`confirmPreview` 表示应用提供的交互：必须展示完整预览、目标地址和模型，并取得用户明确确认。`previewBeforeSend` 为 true 时，内置流水线要求同时传入 `approved: true` 和原始 `approvedPreview`；内容或目的地变化必须重新预览确认。自定义 provider 必须提供准确的 `destination`，否则内置流水线不会通过批准检查。
