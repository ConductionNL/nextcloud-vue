---
kind: code
depends_on: []
---

# Proposal: chat-appid-default-flip

## Why

The AI Chat Companion widget (`CnAiCompanion` / `CnAiFloatingButton`, mounted via `CnAppRoot` in every consuming app) still targets OpenRegister's chat backend by default. Per hydra ADR-034 "Amendment 2026-07-05" the agent engine has moved out of OpenRegister into Hermiq, and the earlier `chat-appid-flip` change deliberately kept `DEFAULT_CHAT_APP_ID = 'openregister'` because two prerequisites were not yet met. Both are now met:

1. **Hermiq engine is live** — the full engine port is merged on hermiq `development` (`lib/Service/Engine/*`, `lib/Service/Llm/*`, routes mirroring OR's `/api/chat/*` + `/api/conversations*`, gated on the `hermiq`.`engine.enabled` app-config flag, with the `MigrateAgentData` repair step for data migration).
2. **OR compat window is shipped** — openregister PR #305 ("compat window — deprecation headers + optional proxy-to-hermiq, non-destructive") is merged on OR `development`, so stale consumers hitting OR's chat routes keep working during the transition.

This change executes the deferred, coordinated one-line default flip (SPECTR-NEXTCLOUD-PLAN.md §7.4 step 5).

## What Changes

- `DEFAULT_CHAT_APP_ID` in `src/composables/aiChatConfig.js` flips from `'openregister'` to `'hermiq'`. **BREAKING** for deployments that rebuild against this library version without Hermiq installed/configured — the widget's health probe (`/apps/hermiq/api/chat/health`) then returns non-2xx and the AI icon silently hides (fail-closed by design, no error surfaced to users).
- Doc comments in `aiChatConfig.js` and `CnAiCompanion.vue` that describe the flip as "deferred" are rewritten to describe the current state: default is `hermiq`; `openregister` remains reachable as an explicit `chatAppId` override during OR's compat window.
- Any unit tests asserting the old default (`'openregister'`) are updated to assert `'hermiq'`; the fallback semantics (nullish/empty app id → default, never `/apps//api`) keep their existing coverage.
- No API surface changes: `chatAppId` prop chain (`CnAppRoot` → `CnAiCompanion` → `CnAiChatPanel` → `CnAiHistoryDialog`) and the `chatXxxUrl(appId)` builders are untouched.

Consumers pick the new default up on the coordinated `@conduction/nextcloud-vue` beta bump + rebuild; deployments that need to stay on OR temporarily can pass `:chat-app-id="'openregister'"` to `CnAppRoot`.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `ai-chat-companion-widget`: the default chat backend app id requirement changes from `openregister` to `hermiq`; the override mechanism and fail-closed health-probe behaviour are unchanged.

## Impact

- **Code**: `src/composables/aiChatConfig.js` (1 constant + doc comment), `src/components/CnAiCompanion/CnAiCompanion.vue` (doc comment), unit tests covering `aiChatConfig`.
- **Consumers**: all ~17 apps mounting `CnAppRoot` change backend on their next nc-vue bump + rebuild — no code change needed in the apps themselves.
- **Runtime prerequisite (deployment, not code)**: Hermiq must have `engine.enabled` on and an LLM chat provider configured (`hermiq.llm`), otherwise the AI icon hides on all apps (same fail-closed behaviour as an unconfigured OR today).
- **Rollback**: revert the one-line constant, or per-deployment override via the `chatAppId` prop.
