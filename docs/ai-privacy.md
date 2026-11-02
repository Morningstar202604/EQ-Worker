# AI Privacy Model

AI in EQ-Worker is an **optional outbound channel**, not a core feature. This document states
precisely what leaves the device, when, and what stops it.

## Default state

AI is disabled. On a fresh install there is no provider, no key, and no request. `disabled.test.ts`
asserts zero `fetch` calls while disabled — this is a tested property, not a claim.

## Turning it on

The user must, in order:

1. Enable AI in the Studio AI view.
2. Choose a provider type, base URL, and model. OpenAI-compatible means Ollama or LM Studio on
   `localhost` works without any third party.
3. Provide an API key (only needed for remote providers; local servers usually ignore it).
4. Generate a preview.
5. Confirm the preview.

Nothing is transmitted before step 5.

## What the preview contains

The preview is built by the same function that builds the request body, so there is exactly one
source of truth. It contains:

- The selected person's name, unless the user turned the name field off
- The relationship type and tags the user allowed
- The scene and any free-text detail the user typed
- Recent interaction summary, within the PII policy

PII fields are **off by default** and individually toggleable. Turning a field off removes it from
the preview and from the request.

## What invalidates an approval

Changing any of the following clears the preview and requires a new confirmation:

- The selected person
- Any field of the context (scene, detail, PII toggles)
- The provider type, base URL, or model
- Importing data, loading the demo dataset, or recording an entry

An in-flight multi-step pipeline is aborted when the context changes, so a stale authorization
cannot continue to send later steps. Each run holds an `AbortController`, and steps check for
cancellation before and after each request.

## What is stored

| Item | Location | Lifetime |
| --- | --- | --- |
| API key | `sessionStorage` | Until the tab closes; never in a backup or export |
| Provider/model/base URL | Local storage (settings) | Persisted, but **excluded from exports** |
| Preview text | Memory | Cleared on context change |
| Results | Memory | Cleared on context change |

The export sanitizer forces `settings.ai` to its default when writing a backup, so a shared backup
cannot leak a provider endpoint or key identifier. Relationship data is preserved unchanged.

## What cannot be guaranteed

- **A request already sent cannot be recalled.**
- **A custom provider's true destination is unverifiable.** The app knows the URL the user typed; it
  cannot prove what the server does with the payload. Using a local endpoint (Ollama, LM Studio) is
  the only configuration where the destination is under the user's control.
- **Model output is unpredictable.** The preview shows the input, not the generated answer.
- **Provider-side retention** follows the provider's policy, not ours.

Because of these limits, the documentation never claims "data never leaves the device". The accurate
statement is: data is local by default, and leaves only when the user explicitly sends it.

## Failure behavior

If a request fails, times out, or is aborted, the app falls back to the local rule engine and labels
the result as locally generated. It does not retry silently — a retry would be a second transmission
the user did not approve.
