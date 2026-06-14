---
kind: code
depends_on: [ai-chat-companion]
chain:
  - ai-chat-companion              # hydra — cross-app contracts (predecessor)
  - ai-chat-companion-orchestrator # openregister (parallel sibling)
  - ai-chat-companion-widget       # this spec (nextcloud-vue)
---

## Why

The cross-app AI Chat Companion architecture is defined in hydra's `ai-chat-companion` change (promoted as [ADR-034](https://github.com/ConductionNL/hydra/blob/development/openspec/architecture/adr-034-ai-chat-companion.md)). The widget — a floating, context-aware FAB + chat panel — ships from `@conduction/nextcloud-vue`; every Conduction app that imports the library gets the widget for free. This change implements the frontend contracts so the ~13 consuming apps can mount a single line and have AI chat available with full page/object context.

## What Changes

- **NEW** `CnAiCompanion` component family in `src/components/CnAiCompanion/`:
  - `CnAiCompanion.vue` — top-level mount; owns the floating button + chat panel + lifecycle. Auto-mounts globally via `CnAppRoot`.
  - `CnAiFloatingButton.vue` — round FAB, bottom-right by default, position overridable via prop.
  - `CnAiChatPanel.vue` — slide-out chat surface with header (agent name, "Start new chat", "History"), message list, input area.
  - `CnAiMessageList.vue` — reusable message rendering with role/content/sources/tool-calls.
  - `CnAiInput.vue` — input box + send button, supports multi-line, enter-to-send.
  - `CnAiHistoryDialog.vue` (in `src/dialogs/` per ADR-004 modal/dialog file-isolation rule) — conversation history browser, NcDialog overlay above the panel.
- **NEW** composables in `src/composables/`:
  - `useAiContext()` — returns the reactive `cnAiContext` via Vue 2 inject, with a default for apps that don't provide overrides.
  - `useAiChatStream()` — owns the EventSource lifecycle for `POST /api/chat/stream`, handles the six-event envelope (`token`, `tool_call`, `tool_result`, `heartbeat`, `final`, `error`), reconnect, abort, and the non-streaming-provider degradation path.
- **MODIFY** `CnAppRoot.vue` — add a reactive `cnAiContext` `provide()` alongside the existing `cnManifest` / `cnCustomComponents` / `cnTranslate` / `cnOpenUserSettings` provides. Initialise with `{ appId, pageKind: 'custom', route }`. Auto-mount `<CnAiCompanion />` as a fixed child so consuming apps get the widget without extra wiring.
- **MODIFY** `CnIndexPage.vue` / `CnDetailPage.vue` / `CnDashboardPage.vue` — each pushes reactive overrides of `pageKind`, `registerSlug`, `schemaSlug`, `objectUuid` (where applicable) into the provided `cnAiContext` whenever their props change. No prop changes; existing consuming apps continue to work.
- **NEW** OR health probe — on mount, `CnAiCompanion` issues `GET /index.php/apps/openregister/api/chat/health` (created by the sibling OR change) and renders nothing on non-2xx response. Result cached for the current page-load. No console warnings above `info` on failure.
- **NEW** `src/index.js` exports for every new component + composable. Bumps types in `src/types/index.d.ts`.
- **NO BREAKING CHANGES.** `CnChatPage` iframe stub is untouched. Existing exports unchanged. Bumps the library to a new minor version on publish.

## Capabilities

### New Capabilities
- `ai-chat-companion-widget`: floating context-aware AI chat widget — the `CnAiCompanion` component family + `useAiContext()` + `useAiChatStream()` composables + `CnAppRoot` integration. Creates `openspec/specs/ai-chat-companion-widget/spec.md`.

### Modified Capabilities
- (none — no existing nc-vue capability spec needs new requirements; `CnAppRoot` / `CnIndexPage` / `CnDetailPage` / `CnDashboardPage` modifications are implementation details of the new widget capability, not requirement changes of existing capabilities)

## Impact

- **Frontend code** in `src/components/CnAiCompanion/` (new dir), `src/composables/` (new files), modifications to `CnAppRoot.vue` + the three Cn*Page wrappers, exports in `src/index.js` and `src/types/index.d.ts`.
- **Test coverage**: Vitest mount + render tests for each new component (~3 each, covering: renders correctly with mock context, hides when health-probe fails, emits expected events). ~3 tests for `useAiChatStream` covering the six event-types parser. `npm run lint` + `npm run stylelint` MUST pass.
- **Browser-side smoke test**: against the live OR backend (sibling change shipped + dev env running), confirm the FAB renders on a detail page, opens, sends, streams.
- **May run in parallel with the sibling `openregister/ai-chat-companion-orchestrator` change** — frontend can mock the SSE endpoint locally for dev. e2e tests block on the orchestrator change shipping.
- **Compatibility with [adr-004-frontend.md](https://github.com/ConductionNL/hydra/blob/development/openspec/architecture/adr-004-frontend.md)**: Vue 2, axios from `@nextcloud/axios` (for non-streaming calls), `t()` for all user-visible strings (en + nl), modals in their own files, CSS variables only, NEVER `fetch()` for mutations, EventSource for SSE (browser-native streaming primitive — not axios).
- **Compatibility with [adr-017-component-composition.md](https://github.com/ConductionNL/hydra/blob/development/openspec/architecture/adr-017-component-composition.md)**: each new component is self-contained (renders its own card / panel / button); consumers MUST NOT wrap them in `CnDetailCard` or similar.
- **Compatibility with [adr-022-apps-consume-or-abstractions.md](https://github.com/ConductionNL/hydra/blob/development/openspec/architecture/adr-022-apps-consume-or-abstractions.md)**: widget calls OR's HTTP API at runtime. Library itself acquires NO PHP/composer dep on OR (this is a JS library); consuming apps acquire a runtime-only dep on OR being reachable.
- **Apps that consume only the widget (e.g. `mydash`)**: zero install-time changes. Bumping `@conduction/nextcloud-vue` to the version shipping this change is the entire integration. The widget no-ops gracefully if OR isn't installed/reachable.
- **i18n**: every new user-visible string in `l10n/en.json` + `l10n/nl.json` (per [adr-007-i18n.md](https://github.com/ConductionNL/hydra/blob/development/openspec/architecture/adr-007-i18n.md)). Keys: `Open AI chat`, `Send`, `Start new chat`, `History`, `Close`, `Connecting...`, etc.
- **Rollback**: bump the consuming app back to a previous nc-vue version. No data migration.

## Future / out-of-scope

- Per-app pilot mounts ([opencatalogi#549](https://github.com/ConductionNL/opencatalogi/issues/549) is the first pilot).
- Refactoring OR's existing full-page chat onto `CnAiMessageList` / `CnAiInput` ([openregister#1459](https://github.com/ConductionNL/openregister/issues/1459)).
- Agent picker UI (one-agent-per-user assumed in v1, see hydra design.md Open Questions).
- Tool-call expansion / drill-down UI for advanced users.
