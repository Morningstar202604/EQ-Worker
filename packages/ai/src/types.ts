import type { AISettings } from './settings';

export type ProviderKind = 'openai' | 'anthropic' | 'custom';

export interface ProviderConfig {
  id: string;
  label: string;
  kind: ProviderKind;
  baseUrl: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export type AIProviderConfig = ProviderConfig;

export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface AIRequest {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface AIUsage {
  inputTokens?: number;
  outputTokens?: number;
}

export interface AIResponse {
  text: string;
  model: string;
  providerId: string;
  usage?: AIUsage;
}

export interface AIProvider {
  readonly id: string;
  readonly label: string;
  readonly kind: ProviderKind;
  chat(request: AIRequest): Promise<AIResponse>;
}

export type AIErrorCode =
  | 'missing_key'
  | 'missing_provider'
  | 'bad_request'
  | 'auth'
  | 'rate_limit'
  | 'not_found'
  | 'server'
  | 'timeout'
  | 'network'
  | 'aborted'
  | 'invalid_response'
  | 'unsupported'
  | 'disabled'
  | 'unknown';

export interface AIError {
  code: AIErrorCode;
  message: string;
  status?: number;
}

export class AIErrorException extends Error implements AIError {
  readonly code: AIErrorCode;
  readonly status?: number;

  constructor(error: AIError, options?: { cause?: unknown }) {
    super(error.message, options);
    this.name = 'AIErrorException';
    this.code = error.code;
    this.status = error.status;
  }
}

export interface ContextPolicy {
  name: boolean;
  birthday: boolean;
  notes: boolean;
  likes: boolean;
  taboos: boolean;
  events: boolean;
}

export interface PersonEvent {
  type?: string;
  kind?: string;
  title?: string;
  amount?: number;
  time?: number;
  date?: string;
}

export interface PersonInput {
  id?: string;
  name?: string;
  identity?: string;
  relation?: string;
  tags?: string[];
  birthday?: string;
  anniversary?: string;
  note?: string;
  notes?: string;
  likes?: string;
  taboos?: string;
  events?: PersonEvent[];
}

export interface PersonContext {
  system: string;
  user: string;
  fields: string[];
  redactions: string[];
}

export interface RedactedPreview {
  system: string;
  user: string;
  fields: string[];
  redactions: string[];
  masked: number;
}

export interface MemoryLike {
  add(personId: string, message: ChatMessage): void;
  recent(personId: string, limit?: number): ChatMessage[];
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type FallbackHandler = (context: PipelineContext, cause: AIError) => unknown | Promise<unknown>;

export interface PipelineFallback {
  handle(context: PipelineContext, cause: AIError): unknown | Promise<unknown>;
}

export type PipelineSettings = Partial<AISettings> & { enabled: boolean };

export interface PipelineContext {
  person: PersonInput;
  context: PersonContext;
  input: Record<string, unknown>;
  outputs: Record<string, unknown>;
  approved?: boolean;
  policy?: ContextPolicy;
  settings?: PipelineSettings;
  memory?: MemoryLike;
}

export interface PipelineDeps {
  provider?: AIProvider;
  settings?: PipelineSettings;
  apiKey?: string;
  fetchImpl?: FetchLike;
  fallback?: FallbackHandler | PipelineFallback;
  requireApproval?: boolean;
  signal?: AbortSignal;
  now?: () => number;
  metadata?: Record<string, unknown>;
}

export interface PipelineStep {
  id: string;
  run: (context: PipelineContext, deps: PipelineDeps) => unknown | Promise<unknown>;
  timeoutMs?: number;
  optional?: boolean;
}

export type PipelineStepStatus = 'ok' | 'skipped' | 'failed';

export interface PipelineStepResult {
  id: string;
  status: PipelineStepStatus;
  output?: unknown;
  ms: number;
  error?: AIError;
}

export type PipelineFailureReason = 'disabled' | 'approval_required' | 'failed';

export interface PipelineResult {
  ok: boolean;
  reason?: PipelineFailureReason;
  steps: PipelineStepResult[];
  output: unknown;
  degraded: boolean;
  error?: AIError;
  preview?: RedactedPreview;
}

export interface PipelineDefinition {
  id: string;
  label: string;
  steps: PipelineStep[];
}
