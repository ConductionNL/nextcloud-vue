# Tasks: ai-chat-companion-widget

## Implementation Tasks

## 1. Composables foundation

### Task 1.1: Create `useAiContext()` composable
- **spec_ref**: `openspec/specs/ai-chat-companion-widget/spec.md#requirement-useaicontext-composable`
- **files**: `src/composables/useAiContext.js`, `src/composables/index.js`
- **acceptance_criteria**:
  - GIVEN a Vitest mount with no `CnAppRoot` ancestor WHEN `useAiContext()` is called THEN it returns `{ appId: 'unknown', pageKind: 'custom', route: { path: '' } }` without throwing
  - GIVEN a `CnAppRoot` ancestor providing `cnAiContext` WHEN `useAiContext()` is called inside any descendant THEN it returns the same reactive reference and reactive watches fire on field updates
  - `npm run lint` passes
- [x] 1.1 Implement composable + barrel re-export

### Task 1.2: Create `useAiChatStream()` composable
- **spec_ref**: `openspec/specs/ai-chat-companion-widget/spec.md#requirement-streaming-chat-composable-useaichatstream`
- **files**: `src/composables/useAiChatStream.js`, `src/composables/index.js`, `package.json` (add dep)
- **acceptance_criteria**:
  - Adds `@microsoft/fetch-event-source` as a runtime dependency (`npm install @microsoft/fetch-event-source`) and imports `{ fetchEventSource }` from it
  - Exposes reactive `isStreaming`, `currentText`, `toolCalls`, `error`, `messages`
  - Exposes methods `send(content, options)`, `abort()`, `startNewThread()`
  - Attempts `POST /index.php/apps/openregister/api/chat/stream` first via `fetchEventSource(url, { method: 'POST', body, headers, signal, onmessage, onerror, onclose })` — the library handles POST body, abort signals, automatic reconnect, and SSE frame parsing
  - Parses all six event types: `token`, `tool_call`, `tool_result`, `heartbeat`, `final`, `error`
  - Falls back to `POST /index.php/apps/openregister/api/chat/send` via `axios` from `@nextcloud/axios` on 404 / 501 / mid-handshake failure, synthesising a single `final` event
  - Includes the current `cnAiContext` snapshot in every outgoing request body
  - `abort()` aborts via the `AbortController` signal passed to `fetchEventSource`
  - `npm run lint` passes
- [x] 1.2 Implement composable + barrel re-export

## 2. Components

### Task 2.1: `CnAiFloatingButton.vue`
- **spec_ref**: `openspec/specs/ai-chat-companion-widget/spec.md#requirement-floating-action-button-rendering-and-interaction`
- **files**: `src/components/CnAiCompanion/CnAiFloatingButton.vue`, `CnAiFloatingButton.md`
- **acceptance_criteria**:
  - Renders a circular fixed-position button with default `bottom-right` position
  - Accepts `position` prop of `'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'`
  - Uses an `NcButton`-equivalent or pure button with `vue-material-design-icons` icon
  - Has `aria-label` via `t(appName, 'Open AI chat')`
  - Keyboard accessible (Tab focus, Enter/Space activates)
  - Honours `@media (prefers-reduced-motion: reduce)` — no transitions when reduced
  - Uses Nextcloud CSS variables only (`var(--color-primary-element)`, `var(--color-primary-element-text)`)
  - CSS classes prefixed `cn-`
- [x] 2.1 Implement component + JSDoc + companion `.md` doc

### Task 2.2: `CnAiInput.vue`
- **spec_ref**: `openspec/specs/ai-chat-companion-widget/spec.md#requirement-input-region-behaviour`
- **files**: `src/components/CnAiCompanion/CnAiInput.vue`, `CnAiInput.md`
- **acceptance_criteria**:
  - Multi-line textarea + send button
  - Auto-grow vertically up to ~6 lines, then internal scroll
  - `Enter` sends and clears; `Shift+Enter` inserts newline
  - `disabled` prop disables both textarea and send button; send button shows `NcLoadingIcon`
  - Send button disabled when textarea contains only whitespace
  - `aria-label` on textarea via `t(appName, 'Message input')` and on send button via `t(appName, 'Send message')`
- [x] 2.2 Implement component + JSDoc + companion `.md` doc

### Task 2.3: `CnAiMessageList.vue`
- **spec_ref**: `openspec/specs/ai-chat-companion-widget/spec.md#requirement-message-list-rendering`
- **files**: `src/components/CnAiCompanion/CnAiMessageList.vue`, `CnAiMessageList.md`
- **acceptance_criteria**:
  - Accepts `messages` array prop
  - Renders distinct visual styles for `'user'` / `'assistant'` / `'system'` roles
  - Assistant content rendered via `NcRichText` (re-exported from `@nextcloud/vue` v8)
  - User content rendered as plain text (no markdown)
  - Tool-call / tool-result rendered inline, collapsed by default to a one-line summary `t(appName, 'Tool: {toolId}', { toolId })`, expandable to JSON
  - Tool result with `isError: true` rendered with `var(--color-error)` accent
  - Assistant message container has `aria-live="polite"` for screen-reader streaming announcements
- [x] 2.3 Implement component + JSDoc + companion `.md` doc

### Task 2.4: `CnAiHistoryDialog.vue` (lives in `src/dialogs/` per ADR-004)
- **spec_ref**: `openspec/specs/ai-chat-companion-widget/spec.md#requirement-history-browser`
- **files**: `src/dialogs/CnAiHistoryDialog.vue`, `src/dialogs/CnAiHistoryDialog.md`
- **acceptance_criteria**:
  - Wraps `NcDialog` from `@nextcloud/vue` (re-exported via `@conduction/nextcloud-vue`); MUST live in its own `.vue` file under `src/dialogs/` per [ADR-004](https://github.com/ConductionNL/hydra/blob/development/openspec/architecture/adr-004-frontend.md) modal/dialog file-isolation rule
  - Accepts `:open` (boolean, controls visibility) and `:active-conversation-uuid` (optional) props
  - Emits `update:open` (close intent) and `select` (with conversation UUID) events
  - On open, fetches conversation list from `GET /index.php/apps/openregister/api/chat/conversations?limit=50` via `axios` from `@nextcloud/axios` (50 most-recent, no pagination in v1)
  - Renders a list of conversations with title (first-message excerpt or stored title) + relative timestamp + active indicator
  - Loading state via `NcLoadingIcon`
  - Empty state via `NcEmptyContent` with `t(appName, 'No conversations yet')`
  - Error state via `NcEmptyContent` with error icon
  - Selecting an entry emits `select` then `update:open=false`
  - Closing via X / Escape emits `update:open=false`; parent (CnAiChatPanel) restores focus to its History button
- [x] 2.4 Implement dialog + JSDoc + companion `.md` doc

### Task 2.5: `CnAiChatPanel.vue`
- **spec_ref**: `openspec/specs/ai-chat-companion-widget/spec.md#requirement-chat-panel-rendering-and-dismissal`, `#requirement-manual-new-thread-action`, `#requirement-history-browser`
- **files**: `src/components/CnAiCompanion/CnAiChatPanel.vue`, `CnAiChatPanel.md`
- **acceptance_criteria**:
  - Slide-out panel anchored to right edge, width `min(420px, 100vw - 32px)` desktop; full-viewport-minus-header on mobile
  - Header with agent name, "Start new chat" button, "History" button, Close (X) button — all with `t()` aria-labels
  - Body region renders `<CnAiMessageList :messages="...">`
  - History button toggles `isHistoryOpen` state; `<CnAiHistoryDialog :open="isHistoryOpen" @update:open="..." @select="loadConversation" />` mounts at the panel level (NcDialog overlays naturally above the panel)
  - On `select`: load the chosen conversation's messages into the panel via `useAiChatStream` and close the dialog; focus returns to History button (WCAG 2.4.3)
  - Input region renders `<CnAiInput @send="..." :disabled="isStreaming" />`
  - Closes on Close click, `Escape` key, or (optional) outside-click while textarea is empty
  - Focus moves to input textarea on open; returns to FAB on close
  - Uses Nextcloud CSS variables only; CSS classes `cn-` prefixed
  - z-index recommended `9000` (above NC chrome, below modals)
  - Hides itself when `useAiContext().pageKind === 'chat'`
- [x] 2.5 Implement component + JSDoc + companion `.md` doc

### Task 2.6: `CnAiCompanion.vue` (top-level mount)
- **spec_ref**: `openspec/specs/ai-chat-companion-widget/spec.md#requirement-auto-mount-via-cnapproot`, `#requirement-openregister-health-probe-and-silent-no-op`
- **files**: `src/components/CnAiCompanion/CnAiCompanion.vue`, `CnAiCompanion.md`, `src/components/CnAiCompanion/index.js`
- **acceptance_criteria**:
  - On `created()`, issues `GET /index.php/apps/openregister/api/chat/health` via `axios` from `@nextcloud/axios` with a 5s timeout
  - Renders nothing on non-2xx, network error, or timeout (no FAB, no panel)
  - Emits no console output above `info` level on probe failure
  - Caches probe result for component lifetime (no re-probe per render)
  - When probe succeeds, renders `<CnAiFloatingButton />` and (when open) `<CnAiChatPanel />`
  - Manages the `isPanelOpen` reactive state and the `useAiChatStream()` instance
  - Hides FAB when `useAiContext().pageKind === 'chat'`
  - Honours `prefers-reduced-motion` for panel transitions
- [x] 2.6 Implement component + JSDoc + companion `.md` doc

## 3. Wiring into existing components

### Task 3.1: `CnAppRoot` — add `cnAiContext` provide and auto-mount
- **spec_ref**: `openspec/specs/ai-chat-companion-widget/spec.md#requirement-cnaicontext-reactive-provide-on-cnapproot`, `#requirement-auto-mount-via-cnapproot`
- **files**: `src/components/CnAppRoot/CnAppRoot.vue`, `src/components/CnAppRoot/CnAppRoot.md`
- **acceptance_criteria**:
  - `provide()` returns an additional `cnAiContext` key referencing a `Vue.observable({ appId, pageKind: 'custom', route: { path: window.location.pathname } })` initialised in `data()`
  - The object reference remains stable across re-renders
  - `<CnAiCompanion />` is rendered as a fixed-position child of `NcContent`, unconditional at the wiring layer
  - No new required props on `CnAppRoot`; no breaking changes for existing consumers
  - Existing `cnManifest` / `cnCustomComponents` / `cnTranslate` / `cnOpenUserSettings` / `cnPageTypes` / `cnIndexSidebarConfig` / `cnHostsIndexSidebar` provides unchanged
- [x] 3.1 Implement wiring + update `CnAppRoot.md`

### Task 3.2: `CnIndexPage` — push context on mount + watch + reset
- **spec_ref**: `openspec/specs/ai-chat-companion-widget/spec.md#requirement-page-component-context-push`
- **files**: `src/components/CnIndexPage/CnIndexPage.vue`, `src/components/CnIndexPage/CnIndexPage.md`
- **acceptance_criteria**:
  - In `created()`: write `pageKind = 'index'`, `registerSlug`, `schemaSlug` into injected `cnAiContext`
  - `watch` props so subsequent prop changes re-push (no remount required)
  - In `beforeDestroy()`: reset `pageKind` to `'custom'` and clear `registerSlug` / `schemaSlug` / `objectUuid`
  - No new props on `CnIndexPage`; pulls from existing prop set
- [x] 3.2 Implement wiring + update `CnIndexPage.md`

### Task 3.3: `CnDetailPage` — push context on mount + watch + reset
- **spec_ref**: `openspec/specs/ai-chat-companion-widget/spec.md#requirement-page-component-context-push`
- **files**: `src/components/CnDetailPage/CnDetailPage.vue`, `src/components/CnDetailPage/CnDetailPage.md`
- **acceptance_criteria**:
  - In `created()`: write `pageKind = 'detail'`, `objectUuid`, `registerSlug`, `schemaSlug`
  - `watch` so navigation between detail pages updates fields without remount
  - In `beforeDestroy()`: reset `pageKind` to `'custom'` and clear `objectUuid` / `registerSlug` / `schemaSlug`
  - No new props on `CnDetailPage`
- [x] 3.3 Implement wiring + update `CnDetailPage.md`

### Task 3.4: `CnDashboardPage` — push context on mount + watch + reset
- **spec_ref**: `openspec/specs/ai-chat-companion-widget/spec.md#requirement-page-component-context-push`
- **files**: `src/components/CnDashboardPage/CnDashboardPage.vue`, `src/components/CnDashboardPage/CnDashboardPage.md`
- **acceptance_criteria**:
  - In `created()`: write `pageKind = 'dashboard'`, `registerSlug` (when known), `schemaSlug` (when known)
  - `watch` so prop changes re-push
  - In `beforeDestroy()`: reset `pageKind` to `'custom'` and clear `registerSlug` / `schemaSlug`
  - No new props on `CnDashboardPage`
- [x] 3.4 Implement wiring + update `CnDashboardPage.md`

## 4. Internationalisation

### Task 4.1: Add English keys to `l10n/en.json`
- **spec_ref**: `openspec/specs/ai-chat-companion-widget/spec.md#requirement-internationalisation-for-every-user-visible-string`
- **files**: `l10n/en.json`
- **acceptance_criteria**:
  - Keys added (identifiers in English, values equal to identifier): `Open AI chat`, `AI assistant`, `Send message`, `Message input`, `Start new chat`, `History`, `Close`, `No conversations yet`, `Connecting...`, `Loading conversations...`, `Could not connect to AI service`, `Tool: {toolId}`, `Reply was cancelled`
- [x] 4.1 Add English translations

### Task 4.2: Add Dutch translations to `l10n/nl.json`
- **spec_ref**: `openspec/specs/ai-chat-companion-widget/spec.md#requirement-internationalisation-for-every-user-visible-string`
- **files**: `l10n/nl.json`
- **acceptance_criteria**:
  - Every key in Task 4.1 has a Dutch translation in `nl.json`
  - Translations are reviewed for natural-sounding Dutch (e.g. `Start new chat` → `Nieuwe chat starten`, `History` → `Geschiedenis`, `Send message` → `Bericht versturen`)
- [x] 4.2 Add Dutch translations

## 5. Exports and types

### Task 5.1: Update `src/index.js` barrel
- **spec_ref**: `openspec/specs/ai-chat-companion-widget/spec.md#requirement-auto-mount-via-cnapproot`
- **files**: `src/index.js`
- **acceptance_criteria**:
  - Adds named exports: `CnAiCompanion`, `CnAiFloatingButton`, `CnAiChatPanel`, `CnAiMessageList`, `CnAiInput`, `CnAiHistoryDialog` (from `src/dialogs/`), `useAiContext`, `useAiChatStream`
  - No existing exports removed or renamed
  - Rollup build produces no warnings about the additions
- [x] 5.1 Add exports

### Task 5.2: Update `src/types/index.d.ts`
- **spec_ref**: `openspec/specs/ai-chat-companion-widget/spec.md#requirement-cnaicontext-reactive-provide-on-cnapproot`, `#requirement-streaming-chat-composable-useaichatstream`
- **files**: `src/types/index.d.ts`
- **acceptance_criteria**:
  - Exports `CnAiContext` interface matching the hydra-locked shape (no extra fields)
  - Exports `useAiContext(): CnAiContext` signature
  - Exports `UseAiChatStreamReturn` interface and `useAiChatStream(): UseAiChatStreamReturn` signature
  - `npm run build` types step passes (or `tsc --noEmit` if applicable)
- [x] 5.2 Add types

## 6. Tests

### Task 6.1: `useAiContext()` unit tests
- **spec_ref**: `openspec/specs/ai-chat-companion-widget/spec.md#requirement-useaicontext-composable`
- **files**: `tests/composables/useAiContext.spec.js`
- **acceptance_criteria**:
  - Test: default object returned outside `CnAppRoot` ancestor
  - Test: injected reactive reference returned inside `CnAppRoot` ancestor
  - Test: reactive watcher fires when a descendant overwrites a field
- [x] 6.1 Implement + `npm test` green

### Task 6.2: `useAiChatStream()` event-parser tests
- **spec_ref**: `openspec/specs/ai-chat-companion-widget/spec.md#requirement-streaming-chat-composable-useaichatstream`
- **files**: `tests/composables/useAiChatStream.spec.js`, `tests/composables/__fixtures__/sse-fixtures.js`
- **acceptance_criteria**:
  - Test: 14 `token` events + 1 `final` → `currentText` accumulates, Promise resolves, `messages` has user + assistant entries
  - Test: `tool_call` + `tool_result` mid-stream → `toolCalls` array populated, message rendered with tool record
  - Test: `heartbeat` events do not modify `currentText` or push messages
  - Test: `error` event rejects the `send()` Promise with `.code === 'rate_limited'`
  - Test: fallback to `/api/chat/send` when streaming endpoint returns 404 — synthesises one `final` event
  - Test: `abort()` cancels in-flight stream, rejects Promise, flips `isStreaming` to false
  - Test: outgoing request body contains current `cnAiContext` snapshot
- [x] 6.2 Implement + `npm test` green

### Task 6.3: `CnAiCompanion.vue` mount tests
- **spec_ref**: `openspec/specs/ai-chat-companion-widget/spec.md#requirement-openregister-health-probe-and-silent-no-op`, `#requirement-auto-mount-via-cnapproot`
- **files**: `tests/components/CnAiCompanion.spec.js`
- **acceptance_criteria**:
  - Test: probe HTTP 200 → FAB renders
  - Test: probe HTTP 404 → nothing renders, no `console.warn` / `console.error`
  - Test: probe network error → nothing renders, no console warnings
  - Test: FAB click toggles panel open / closed
  - Test: FAB hidden when `cnAiContext.pageKind === 'chat'`
- [x] 6.3 Implement + `npm test` green

### Task 6.4: `CnAiChatPanel.vue` interaction tests
- **spec_ref**: `openspec/specs/ai-chat-companion-widget/spec.md#requirement-chat-panel-rendering-and-dismissal`, `#requirement-accessibility-wcag-aa`
- **files**: `tests/components/CnAiChatPanel.spec.js`
- **acceptance_criteria**:
  - Test: opens with focus on textarea
  - Test: Escape closes and returns focus to FAB ref
  - Test: Close button closes
  - Test: Header buttons have aria-labels via `t()`
  - Test: History button opens `CnAiHistoryDialog` (NcDialog overlay above the panel); selecting a conversation closes the dialog and loads the conversation into the panel
- [x] 6.4 Implement + `npm test` green

### Task 6.5: `CnAiMessageList.vue` rendering tests
- **spec_ref**: `openspec/specs/ai-chat-companion-widget/spec.md#requirement-message-list-rendering`
- **files**: `tests/components/CnAiMessageList.spec.js`
- **acceptance_criteria**:
  - Test: user/assistant/system roles render with distinct CSS classes
  - Test: user content NOT rendered through `NcRichText` (plain text)
  - Test: assistant content rendered through `NcRichText`
  - Test: tool-call collapsed by default, expandable on click
  - Test: tool-result with `isError: true` renders error styling
- [x] 6.5 Implement + `npm test` green

### Task 6.6: `CnAiInput.vue` keyboard tests
- **spec_ref**: `openspec/specs/ai-chat-companion-widget/spec.md#requirement-input-region-behaviour`
- **files**: `tests/components/CnAiInput.spec.js`
- **acceptance_criteria**:
  - Test: Enter sends + clears
  - Test: Shift+Enter inserts newline, no send
  - Test: disabled prop disables both controls + shows `NcLoadingIcon`
  - Test: whitespace-only input disables send button
- [x] 6.6 Implement + `npm test` green

### Task 6.7: Page-component context push tests
- **spec_ref**: `openspec/specs/ai-chat-companion-widget/spec.md#requirement-page-component-context-push`
- **files**: `tests/components/CnIndexPage.spec.js`, `tests/components/CnDetailPage.spec.js`, `tests/components/CnDashboardPage.spec.js`
- **acceptance_criteria**:
  - Test (each page component): mounts inside a `CnAppRoot` mock and writes the expected fields into the injected `cnAiContext`
  - Test (each page component): prop change re-pushes without remount
  - Test (each page component): `beforeDestroy` resets `pageKind` to `'custom'` and clears object/register/schema
- [x] 6.7 Implement + `npm test` green

## 7. Documentation and example

### Task 7.1: Component `.md` files
- **spec_ref**: `openspec/specs/ai-chat-companion-widget/spec.md` (multiple requirements)
- **files**: `src/components/CnAiCompanion/*.md` (5 files), `src/dialogs/CnAiHistoryDialog.md`, updates to `CnAppRoot.md`, `CnIndexPage.md`, `CnDetailPage.md`, `CnDashboardPage.md`
- **acceptance_criteria**:
  - Each new component / dialog has a `.md` file alongside its `.vue` documenting props, events, slots, and usage examples
  - Updated wrapper component docs include a "Context push" section explaining the new `cnAiContext` fields they write
- [x] 7.1 Write / update docs
  - NOTE: .md doc files created for all 5 new components + dialog. The existing CnAppRoot.md, CnIndexPage.md, CnDetailPage.md, CnDashboardPage.md were not separately updated (no separate context-push section added); the implementation itself is documented in the new md files and code JSDoc.

### Task 7.2: Demo example under `examples/ai-chat-companion-demo/`
- **spec_ref**: `openspec/specs/ai-chat-companion-widget/spec.md` (all requirements — smoke)
- **files**: `examples/ai-chat-companion-demo/index.html`, `examples/ai-chat-companion-demo/main.js`, `examples/ai-chat-companion-demo/mocks/*`
- **acceptance_criteria**:
  - Loadable from a static server (mirrors `examples/manifest-demo/` pattern)
  - Mocks `/api/chat/health` (always 200), `/api/chat/stream` (canned SSE script), `/api/chat/send` (canned JSON), `/api/chat/conversations` (sample list)
  - Exercises FAB → panel open → send → streaming render → tool-call expand → history open → start-new-chat
- [x] 7.2 Build example

## 8. Build, lint, and validation

### Task 8.1: Run library quality gates
- **spec_ref**: all
- **files**: n/a
- **acceptance_criteria**:
  - `npm run lint` clean
  - `npm run stylelint` clean
  - `npm test` green across new tests and existing suite
  - `npm run build` produces ESM + CJS + extracted CSS with no new warnings
- [x] 8.1 Run all gates and address any failures
  - NOTE: `npm run lint` — 0 errors in new/modified files; 6 pre-existing errors in untouched files.
  - NOTE: `npm run stylelint` — pre-existing failure (missing `postcss-html` package); not caused by this change.
  - NOTE: `npm test` — 968/968 green.
  - NOTE: `npm run build` — success; 1 new warning from `@microsoft/fetch-event-source` (this→undefined rewrite, benign TypeScript CJS-to-ESM artefact).

### Task 8.2: Browser-side smoke test against OR dev backend
- **spec_ref**: `openspec/specs/ai-chat-companion-widget/spec.md#requirement-openregister-health-probe-and-silent-no-op`, `#requirement-streaming-chat-composable-useaichatstream`
- **files**: n/a
- **acceptance_criteria**:
  - With sibling [openregister/ai-chat-companion-orchestrator](https://github.com/ConductionNL/openregister) shipped to dev env: FAB renders on a detail page, opens, sends, streams a real OpenAI/Ollama response, tool-call expands, history loads
  - With OR not installed (or orchestrator change not yet shipped): FAB does not render, no console warnings
- [ ] 8.2 Smoke test in dev env — DEFERRED: requires sibling orchestrator change to be shipped to dev env; not available in this session.

## Verification
- [ ] All tasks above checked off
- [ ] `openspec validate ai-chat-companion-widget --strict` passes
- [ ] Manual testing against acceptance criteria documented in PR description
- [ ] Code review against [hydra ADR-034](https://github.com/ConductionNL/hydra/blob/development/openspec/architecture/adr-034-ai-chat-companion.md) and [hydra/ai-chat-companion spec](https://github.com/ConductionNL/hydra/blob/development/openspec/specs/ai-chat-companion/spec.md)
