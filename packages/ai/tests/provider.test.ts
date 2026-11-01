import { describe, expect, it } from 'vitest';
import {
  AIErrorException,
  createProvider,
  type FetchLike,
  type ProviderConfig
} from '../src/index';

const API_KEY = 'sk-test-secret-key-123456';

interface Captured {
  url: string;
  init?: RequestInit;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

const openaiConfig: ProviderConfig = {
  id: 'openai-compatible',
  label: 'OpenAI 兼容',
  kind: 'openai',
  baseUrl: 'https://api.openai.com/v1/',
  model: 'gpt-4o-mini',
  temperature: 0.3,
  maxTokens: 256
};

const anthropicConfig: ProviderConfig = {
  id: 'anthropic',
  label: 'Anthropic',
  kind: 'anthropic',
  baseUrl: 'https://api.anthropic.com',
  model: 'claude-3-5-sonnet-latest',
  temperature: 0.2,
  maxTokens: 512
};

async function captureError(task: Promise<unknown>): Promise<AIErrorException> {
  try {
    await task;
  } catch (error) {
    expect(error).toBeInstanceOf(AIErrorException);
    return error as AIErrorException;
  }
  throw new Error('expected provider to throw');
}

describe.each([['OpenAI', openaiConfig], ['Anthropic', anthropicConfig]] as const)('%s response body cancellation', (_name, config) => {
  it('propagates abort after headers while the body is pending', async () => {
    let bodyStarted: (() => void) | undefined;
    const started = new Promise<void>((resolve) => { bodyStarted = resolve; });
    let resolveBody: ((value: string) => void) | undefined;
    const fetchImpl: FetchLike = async (_url, init) => ({
      ok: true,
      text: () => new Promise<string>((resolve, reject) => {
        resolveBody = resolve;
        init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        bodyStarted?.();
      })
    } as Response);
    const controller = new AbortController();
    const provider = createProvider(config, { fetchImpl, apiKey: API_KEY });
    const pending = captureError(provider.chat({ messages: [{ role: 'user', content: 'hi' }], signal: controller.signal }));
    await started;
    controller.abort();
    resolveBody?.('invalid');
    expect((await pending).code).toBe('aborted');
  });

  it('times out while the response body is pending', async () => {
    const fetchImpl: FetchLike = async (_url, init) => ({
      ok: true,
      text: () => new Promise<string>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
      })
    } as Response);
    const provider = createProvider(config, { fetchImpl, apiKey: API_KEY });
    const error = await captureError(provider.chat({ messages: [{ role: 'user', content: 'hi' }], timeoutMs: 10 }));
    expect(error.code).toBe('timeout');
  });
});

describe('OpenAI compatible provider', () => {
  it('posts to /chat/completions with auth header and model body', async () => {
    const captured: Captured[] = [];
    const fetchImpl: FetchLike = async (url, init) => {
      captured.push({ url, init });
      return jsonResponse({
        model: 'gpt-4o-mini-2024',
        choices: [{ message: { role: 'assistant', content: '你好' } }],
        usage: { prompt_tokens: 10, completion_tokens: 2 }
      });
    };

    const provider = createProvider(openaiConfig, { fetchImpl, apiKey: API_KEY });
    const response = await provider.chat({
      messages: [
        { role: 'system', content: '系统提示' },
        { role: 'user', content: '帮我写一句道谢' }
      ]
    });

    expect(captured).toHaveLength(1);
    expect(captured[0].url).toBe('https://api.openai.com/v1/chat/completions');
    expect(captured[0].init?.method).toBe('POST');

    const headers = new Headers(captured[0].init?.headers);
    expect(headers.get('authorization')).toBe(`Bearer ${API_KEY}`);
    expect(headers.get('content-type')).toBe('application/json');

    const body = JSON.parse(String(captured[0].init?.body)) as Record<string, unknown>;
    expect(body.model).toBe('gpt-4o-mini');
    expect(body.temperature).toBe(0.3);
    expect(body.max_tokens).toBe(256);
    expect(body.stream).toBe(false);
    expect(body.messages).toEqual([
      { role: 'system', content: '系统提示' },
      { role: 'user', content: '帮我写一句道谢' }
    ]);

    expect(response.text).toBe('你好');
    expect(response.providerId).toBe('openai-compatible');
    expect(response.usage).toEqual({ inputTokens: 10, outputTokens: 2 });
  });

  it('keeps custom base urls for Ollama or LM Studio style endpoints', async () => {
    const captured: Captured[] = [];
    const fetchImpl: FetchLike = async (url, init) => {
      captured.push({ url, init });
      return jsonResponse({ choices: [{ message: { content: '本地模型' } }] });
    };

    const provider = createProvider(
      { ...openaiConfig, baseUrl: 'http://127.0.0.1:11434/v1', id: 'ollama' },
      { fetchImpl, apiKey: 'ollama-local' }
    );
    await provider.chat({ messages: [{ role: 'user', content: 'hi' }] });

    expect(captured[0].url).toBe('http://127.0.0.1:11434/v1/chat/completions');
  });

  it('scrubs the api key from 401 error messages', async () => {
    const leaky = `Incorrect API key provided: ${API_KEY}. Authorization: Bearer ${API_KEY}`;
    const fetchImpl: FetchLike = async () =>
      jsonResponse({ error: { message: leaky } }, 401);
    const provider = createProvider(openaiConfig, { fetchImpl, apiKey: API_KEY });

    const error = await captureError(
      provider.chat({ messages: [{ role: 'user', content: 'hi' }] })
    );

    expect(error.code).toBe('auth');
    expect(error.status).toBe(401);
    expect(error.message).not.toContain(API_KEY);
    expect(error.message).not.toContain('Bearer sk-');
  });

  it('maps 400 responses to bad_request', async () => {
    const fetchImpl: FetchLike = async () =>
      jsonResponse({ error: { message: 'messages is required' } }, 400);
    const provider = createProvider(openaiConfig, { fetchImpl, apiKey: API_KEY });

    const error = await captureError(
      provider.chat({ messages: [{ role: 'user', content: 'hi' }] })
    );

    expect(error.code).toBe('bad_request');
    expect(error.status).toBe(400);
  });

  it('maps aborted requests to timeout without leaking the key', async () => {
    const fetchImpl: FetchLike = (_url, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });
    const provider = createProvider(openaiConfig, { fetchImpl, apiKey: API_KEY });

    const error = await captureError(
      provider.chat({ messages: [{ role: 'user', content: 'hi' }], timeoutMs: 5 })
    );

    expect(error.code).toBe('timeout');
    expect(error.message).not.toContain(API_KEY);
  });

  it('rejects provider creation without an api key', () => {
    expect(() => createProvider(openaiConfig, { apiKey: '' })).toThrow(AIErrorException);
    try {
      createProvider(openaiConfig, { apiKey: '' });
    } catch (error) {
      expect((error as AIErrorException).code).toBe('missing_key');
    }
  });
});

describe('Anthropic provider', () => {
  it('posts to /v1/messages with x-api-key and anthropic-version', async () => {
    const captured: Captured[] = [];
    const fetchImpl: FetchLike = async (url, init) => {
      captured.push({ url, init });
      return jsonResponse({
        model: 'claude-3-5-sonnet-latest',
        content: [
          { type: 'text', text: '第一段' },
          { type: 'text', text: '第二段' }
        ],
        usage: { input_tokens: 12, output_tokens: 6 }
      });
    };

    const provider = createProvider(anthropicConfig, { fetchImpl, apiKey: API_KEY });
    const response = await provider.chat({
      messages: [
        { role: 'system', content: '只输出中文' },
        { role: 'user', content: '写一句祝福' }
      ]
    });

    expect(captured).toHaveLength(1);
    expect(captured[0].url).toBe('https://api.anthropic.com/v1/messages');
    expect(captured[0].init?.method).toBe('POST');

    const headers = new Headers(captured[0].init?.headers);
    expect(headers.get('x-api-key')).toBe(API_KEY);
    expect(headers.get('anthropic-version')).toBe('2023-06-01');
    expect(headers.get('authorization')).toBeNull();

    const body = JSON.parse(String(captured[0].init?.body)) as Record<string, unknown>;
    expect(body.model).toBe('claude-3-5-sonnet-latest');
    expect(body.max_tokens).toBe(512);
    expect(body.system).toBe('只输出中文');
    expect(body.messages).toEqual([{ role: 'user', content: '写一句祝福' }]);
    expect(response.text).toBe('第一段第二段');
    expect(response.usage).toEqual({ inputTokens: 12, outputTokens: 6 });
  });

  it('does not duplicate /v1 when the base url already includes it', async () => {
    const captured: Captured[] = [];
    const fetchImpl: FetchLike = async (url, init) => {
      captured.push({ url, init });
      return jsonResponse({ content: [{ type: 'text', text: 'ok' }] });
    };
    const provider = createProvider(
      { ...anthropicConfig, baseUrl: 'https://proxy.example.com/v1' },
      { fetchImpl, apiKey: API_KEY }
    );
    await provider.chat({ messages: [{ role: 'user', content: 'hi' }] });

    expect(captured[0].url).toBe('https://proxy.example.com/v1/messages');
  });

  it('scrubs the api key from 401 error messages', async () => {
    const fetchImpl: FetchLike = async () =>
      jsonResponse({ error: { message: `invalid x-api-key ${API_KEY}` } }, 401);
    const provider = createProvider(anthropicConfig, { fetchImpl, apiKey: API_KEY });

    const error = await captureError(
      provider.chat({ messages: [{ role: 'user', content: 'hi' }] })
    );

    expect(error.code).toBe('auth');
    expect(error.status).toBe(401);
    expect(error.message).not.toContain(API_KEY);
  });
});
