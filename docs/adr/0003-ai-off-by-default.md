# 0003 — AI is opt-in, previewed, and never required

- **Status**: Accepted
- **Date**: 2026-10-31

## Context

The product's promise is that your relationship records stay yours. Adding AI creates an obvious
tension: useful advice benefits from context, and context is personal.

Three possible positions:

1. **AI as a core feature**, calling a model by default. Best out-of-box experience; breaks the
   privacy promise and requires either a funded API key or a self-hosted proxy — both are servers.
2. **No AI at all.** Simplest promise; leaves the "advice" surface weaker than competitors.
3. **AI as an optional, user-supplied channel.** Default off, user brings a key, user sees exactly
   what will be sent.

## Decision

**Option 3**, with red lines encoded in code and tests:

- Disabled by default; zero network calls when disabled (asserted by counting `fetch` calls).
- Provider configuration is the user's: type, base URL, model, key. OpenAI-compatible endpoints
  mean Ollama and LM Studio work locally.
- A preview is mandatory before sending. The preview text is constructed by the same function that
  builds the request body, so the two cannot drift.
- Approval is bound to the target person, the context, the provider, the model, and the endpoint.
  Changing any of them invalidates the approval.
- Keys live in `sessionStorage` only, are never rendered back into the DOM, and are never included
  in exports.
- Requests are cancellable; changing context mid-run aborts in-flight steps rather than letting a
  stale authorization continue.
- On failure, fall back to the local rule engine and say so.

## Consequences

**Good**

- The privacy promise survives: no data leaves the device unless the user explicitly sends it.
- No server to operate, no shared API key to leak, no per-user cost.
- The preview doubles as a transparency feature and as the debugging surface.

**Accepted costs**

- Users must obtain their own API key, which is friction.
- Advice quality depends on the model the user chooses.
- A preview shows the text but cannot show the model's output, so "what will be generated" is
  inherently unpredictable.
- A custom provider can lie about where it sends data; we cannot verify an injected transport's
  real destination. This is documented rather than papered over.
- Data already sent cannot be recalled.
