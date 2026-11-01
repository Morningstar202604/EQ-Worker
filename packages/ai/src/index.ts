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
