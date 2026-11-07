export type {
  AIError,
  AIErrorCode,
  AIErrorException as AIErrorExceptionType,
  AIProvider,
  AIProviderConfig,
  AIRequest,
  AIResponse,
  AIUsage,
  ChatMessage,
  ChatRole,
  ContextPolicy,
  FallbackHandler,
  FetchLike,
  MemoryLike,
  PersonContext,
  PersonEvent,
  PersonInput,
  PipelineContext,
  PipelineDefinition,
  PipelineDeps,
  PipelineFailureReason,
  PipelineFallback,
  PipelineResult,
  PipelineSettings,
  PipelineStep,
  PipelineStepResult,
  PipelineStepStatus,
  ProviderConfig,
  ProviderKind,
  RedactedPreview
} from './types';
export { AIErrorException } from './types';

export { createProvider, toAIError } from './provider';
export type { CreateProviderDeps } from './provider';

export { createOpenAIProvider } from './providers/openai';
export type { OpenAIProviderDeps } from './providers/openai';
export { createAnthropicProvider } from './providers/anthropic';
export type { AnthropicProviderDeps } from './providers/anthropic';
export { createMockProvider } from './providers/mock';
export type { MockProvider, MockProviderOptions } from './providers/mock';

export {
  DEFAULT_CONTEXT_POLICY,
  buildPersonContext,
  maskSecrets,
  redactPreview,
  scrubSecrets
} from './context';
export type { ContextBuildOptions, PreviewPayload } from './context';

export { runPipeline } from './pipeline';

export {
  BUILTIN_PIPELINE_ID,
  BUILTIN_PIPELINES,
  SCENE_IDS,
  builtinPipeline,
  getBuiltinPipeline,
  giftAdviceStep,
  reviewStep,
  sceneDetectStep,
  scriptGenerateStep
} from './pipelines';
export type { GiftAdviceOutput, ReviewOutput, SceneId, ScriptOutput, ScriptVariant } from './pipelines';

/* 联网搜索与工具调用（v3.8.0）。两者默认关闭，不开启时不发任何网络请求。 */
export {
  DEFAULT_SEARCH_SETTINGS,
  builtinSearchTool,
  searchWeb,
  validateSearchSettings,
  willUseNetwork
} from './search';
export type { SearchBackend, SearchHit, SearchOutcome, SearchResult, SearchSettings } from './search';
export { BING_NOTICE, freeSearch, hitsToContext, parseBingHtml, parseBingRss, parseSogouHtml } from './free-search';
export type { FreeSearchHit, FreeSearchOptions, FreeSearchOutcome, FreeSearchResult } from './free-search';
export { detectContext, looksIrrelevant, planQueries } from './query-plan';
export type { QueryPlan } from './query-plan';
export { MAX_TOOL_CALLS, TOOL_DEFINITIONS, runTool, toolCatalog } from './tools';
export type { ToolCallResult, ToolContext, ToolDefinition } from './tools';

export { MemoryStore, createLocalStorageAdapter } from './memory';
export type {
  MemoryEntry,
  MemoryExport,
  MemoryExportPerson,
  MemoryStorage,
  MemoryStoreOptions
} from './memory';

export {
  defaultAISettings,
  parseAISettings,
  serializeAISettings,
  validateAISettings
} from './settings';
export type { AISettings, SettingsParseResult, SettingsValidation } from './settings';

export { FallbackChain, createFallbackHandler, defaultRule, ruleText } from './fallback';
export type {
  FallbackChainOptions,
  FallbackExecuteOptions,
  FallbackOutcome,
  FallbackReason,
  RuleContext,
  RuleHandler,
  RuleResult
} from './fallback';
