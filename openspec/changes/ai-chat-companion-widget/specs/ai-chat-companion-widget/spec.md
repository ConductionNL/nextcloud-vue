# ai-chat-companion-widget Specification

## Purpose

`@conduction/nextcloud-vue` SHALL ship a context-aware AI chat widget — a floating action button (FAB) anchored to the viewport plus a slide-out chat panel — that every consuming Conduction app (`opencatalogi`, `openconnector`, `docudesk`, `decidesk`, `mydash`, `softwarecatalog`, `larpingapp`, `zaakafhandelapp`, `procest`, `pipelinq`, `openregister`, and the ExApp sidecars) receives automatically by upgrading the library. The widget talks to OpenRegister's HTTP chat API at runtime, consumes a reactive `cnAiContext` provided by `CnAppRoot`, renders nothing when OpenRegister is unreachable, and progressively enhances from non-streaming `POST /api/chat/send` to SSE `POST /api/chat/stream` (delivered by the sibling [openregister/ai-chat-companion-orchestrator](https://github.com/ConductionNL/openregister) change) without changing the contract presented to consuming apps.

This spec implements the frontend half of [hydra ADR-034: AI Chat Companion — Cross-App Architecture](https://github.com/ConductionNL/hydra/blob/development/openspec/architecture/adr-034-ai-chat-companion.md) and the widget-facing slice of [hydra/openspec/specs/ai-chat-companion/spec.md](https://github.com/ConductionNL/hydra/blob/development/openspec/specs/ai-chat-companion/spec.md).

## ADDED Requirements

### Requirement: Auto-mount via CnAppRoot

`CnAppRoot` SHALL render `<CnAiCompanion />` as a fixed-position child of `NcContent` so every Conduction app that wraps its UI in `CnAppRoot` receives the widget without any per-app wiring. The auto-mount MUST occur unconditionally at the `CnAppRoot` level; gating (health probe, `pageKind` overrides, etc.) MUST happen inside `CnAiCompanion` itself.

The companion MUST render at a CSS stacking level above standard Nextcloud chrome but below modals — the recommended z-index is `9000`. The companion MUST NOT depend on or interact with `CnChatPage`'s existing iframe stub — `CnChatPage` is untouched by this spec.

#### Scenario: Auto-mount on every CnAppRoot host

- **GIVEN** a consuming app that bumps `@conduction/nextcloud-vue` to the version shipping this change
- **WHEN** the app boots and mounts `<CnAppRoot :manifest="..." :translate="t" ...>` with no companion-specific configuration
- **THEN** `<CnAiCompanion />` is present in the rendered DOM tree as a descendant of `NcContent`, positioned `fixed` and styled with the agreed z-index, with the consuming app needing no additional template changes

#### Scenario: CnChatPage iframe stub is not modified

- **GIVEN** the existing `src/components/CnChatPage/` directory
- **WHEN** this change ships
- **THEN** `CnChatPage.vue` is unchanged in source and behaviour; consuming apps that route to `CnChatPage` continue to see the iframe stub exactly as before

### Requirement: OpenRegister health probe and silent no-op

On first mount, `CnAiCompanion` SHALL issue an authenticated `GET /index.php/apps/openregister/api/chat/health` request via `axios` from `@nextcloud/axios`. When the response is non-2xx, the request errors, or the request times out (default 5 seconds), the companion MUST render nothing — no FAB, no chat panel — and MUST NOT emit any console output above `info` level. The result of the probe MAY be cached for the lifetime of the current page-load; the companion MUST NOT re-probe on every render.

Apps that consume only the widget MUST NOT acquire any install-time PHP or composer dependency on OpenRegister as a side effect of this requirement (the library itself is JavaScript; this requirement is a runtime expectation only).

#### Scenario: OpenRegister installed and healthy

- **GIVEN** a Nextcloud instance with OpenRegister installed and its `/api/chat/health` endpoint returning HTTP 200
- **WHEN** `<CnAppRoot>` mounts in any consuming app
- **THEN** the floating action button is visible, focusable, and clickable

#### Scenario: OpenRegister missing or unreachable

- **GIVEN** a Nextcloud instance where `/api/chat/health` returns a non-2xx status or fails with a network error
- **WHEN** `<CnAppRoot>` mounts
- **THEN** no FAB or chat panel renders, the `CnAiCompanion` root element is either absent or has zero height/width, and no `console.warn` / `console.error` messages are emitted by the companion (only `console.info` or below is acceptable)

#### Scenario: mydash mounts without an install-time OR dependency

- **GIVEN** the `mydash` app installs `@conduction/nextcloud-vue` at the version shipping this change
- **WHEN** `mydash`'s `composer.json` and `appinfo/info.xml` are inspected after the dependency bump
- **THEN** neither file declares `openregister` (or any OpenRegister-owned composer package) as a dependency

### Requirement: cnAiContext reactive provide on CnAppRoot

`CnAppRoot` SHALL `provide()` a reactive object under the well-known Vue 2 injection symbol `cnAiContext`, alongside its existing `cnManifest` / `cnCustomComponents` / `cnTranslate` / `cnOpenUserSettings` / `cnPageTypes` / `cnIndexSidebarConfig` / `cnHostsIndexSidebar` provides. The initial shape MUST match the hydra-locked TypeScript interface and MUST NOT add fields beyond it:

```ts
interface CnAiContext {
  appId: string
  pageKind: 'index' | 'detail' | 'dashboard' | 'chat' | 'settings' | 'custom'
  objectUuid?: string
  registerSlug?: string
  schemaSlug?: string
  route?: { path: string, name?: string, params?: Record<string, string> }
}
```

`CnAppRoot` MUST initialise the object with `{ appId: <derived from manifest>, pageKind: 'custom', route: { path: window.location.pathname } }`. Descendants overwrite fields reactively; the same object reference MUST remain stable across the lifetime of `CnAppRoot` so the widget's `useAiContext()` consumer sees overrides without remounting.

#### Scenario: Initial provide on CnAppRoot mount

- **GIVEN** `CnAppRoot` mounted with `manifest.appId = 'opencatalogi'` and no `Cn*Page` descendant yet rendered
- **WHEN** the companion calls `useAiContext()`
- **THEN** the returned reactive object equals `{ appId: 'opencatalogi', pageKind: 'custom', route: { path: window.location.pathname } }` and the same reference survives subsequent navigations

#### Scenario: Object reference stable across re-renders

- **GIVEN** the companion holds a closure over the injected `cnAiContext` reference
- **WHEN** the consuming app re-renders or descendants overwrite fields on the object
- **THEN** the reference equality (`oldRef === newRef`) holds, and reactive watchers on individual fields fire without remount

### Requirement: useAiContext composable

`@conduction/nextcloud-vue` SHALL export a `useAiContext()` composable from `src/composables/useAiContext.js` that returns the reactive `cnAiContext` injected from `CnAppRoot`. When invoked outside of a `CnAppRoot` ancestor (for example, in a Vitest mount without the root wrapper), `useAiContext()` MUST return a default reactive object of shape `{ appId: 'unknown', pageKind: 'custom', route: { path: '' } }` so consumers do not crash.

`useAiContext()` MUST return the reactive reference itself, not a snapshot — consumers rely on reactive subscriptions to re-evaluate when descendants push overrides.

#### Scenario: useAiContext outside CnAppRoot returns default

- **GIVEN** a Vitest test that mounts `<CnAiCompanion />` without a `CnAppRoot` ancestor
- **WHEN** the component invokes `useAiContext()` in its `setup()` or `data()`
- **THEN** the returned object equals `{ appId: 'unknown', pageKind: 'custom', route: { path: '' } }` and no exception is thrown

#### Scenario: Composable returns the live reactive reference

- **GIVEN** `CnAppRoot` provides `cnAiContext` and a descendant `CnDetailPage` overrides `pageKind` to `'detail'` after mount
- **WHEN** the companion's reactive expression `useAiContext().pageKind` is evaluated before and after the override
- **THEN** the expression yields `'custom'` first and `'detail'` after, without the companion re-injecting

### Requirement: Page-component context push

`CnIndexPage`, `CnDetailPage`, and `CnDashboardPage` SHALL each push reactive overrides into the injected `cnAiContext` whenever their relevant props change. The mapping MUST be:

| Component | Fields written |
|---|---|
| `CnIndexPage` | `pageKind = 'index'`, `registerSlug`, `schemaSlug` |
| `CnDetailPage` | `pageKind = 'detail'`, `objectUuid`, `registerSlug`, `schemaSlug` |
| `CnDashboardPage` | `pageKind = 'dashboard'`, `registerSlug` (when known), `schemaSlug` (when known) |

Each page component MUST overwrite the named fields in `created()` (or equivalent lifecycle hook) and MUST set up a `watch` so that subsequent prop changes re-push without remount. When the page component unmounts, it MUST reset `pageKind` back to `'custom'` and clear `objectUuid`, `registerSlug`, `schemaSlug` so the widget on subsequent custom pages does not see stale context.

No new props MUST be added to `CnIndexPage` / `CnDetailPage` / `CnDashboardPage`; the push is derived from existing props the components already accept.

#### Scenario: Detail page push on mount

- **GIVEN** `CnAppRoot` provides `cnAiContext` with `appId: 'opencatalogi'` and `CnDetailPage` mounts with props mapping to `registerSlug: 'catalogus'`, `schemaSlug: 'organisation'`, `objectUuid: '00000000-0000-0000-0000-000000000000'`
- **WHEN** the widget reads `useAiContext()` after `CnDetailPage`'s `created()` runs
- **THEN** the values returned are exactly `{ appId: 'opencatalogi', pageKind: 'detail', objectUuid: '00000000-0000-0000-0000-000000000000', registerSlug: 'catalogus', schemaSlug: 'organisation', route: { path: <current pathname> } }`

#### Scenario: Reactive update on navigation

- **GIVEN** the user is on `CnDetailPage` for object A and navigates to `CnDetailPage` for object B without leaving the app
- **WHEN** the route prop updates `objectUuid` from A to B
- **THEN** `useAiContext().objectUuid` reflects B, the companion does not remount, and the companion's open chat panel (if any) keeps its scroll position and draft input

#### Scenario: Context reset on page unmount

- **GIVEN** `CnDetailPage` is mounted and has pushed `pageKind: 'detail'` + `objectUuid: 'X'`
- **WHEN** the user navigates to a route that renders neither `CnIndexPage` / `CnDetailPage` / `CnDashboardPage` (e.g. a custom Vue route) and `CnDetailPage` unmounts
- **THEN** `useAiContext()` returns `{ appId: <appId>, pageKind: 'custom', route: { path: <new pathname> } }` with `objectUuid`, `registerSlug`, `schemaSlug` cleared

### Requirement: Floating action button rendering and interaction

`CnAiFloatingButton.vue` SHALL render a circular button positioned `fixed` in the viewport. Default position is bottom-right (`right: 24px; bottom: 24px;`); the position MUST be overridable via a `position` prop accepting one of `'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'`, defaulting to `'bottom-right'`. The button MUST:

- Render an AI/chat icon (a `vue-material-design-icons` icon, e.g. `RobotOutline` or `ChatProcessingOutline`).
- Have an `aria-label` populated via `t(appName, 'Open AI chat')` for screen-reader accessibility.
- Be reachable via keyboard tab order with a visible focus ring using `var(--color-primary-element)`.
- Toggle the chat panel open/closed when clicked or activated via Enter/Space.
- Hide itself (set `display: none` or equivalent) while the chat panel is open so it does not visually compete with the panel.

The button MUST respect `prefers-reduced-motion`: when the media query matches, no entrance animation or hover transform MUST be applied (a static appearance is acceptable).

#### Scenario: Default position and click opens panel

- **GIVEN** `CnAiCompanion` rendered with health probe successful and no `position` prop override
- **WHEN** the user clicks the FAB
- **THEN** the chat panel transitions in from the right edge, the FAB hides, and the chat panel's input element receives focus

#### Scenario: Keyboard activation opens panel

- **GIVEN** the FAB is rendered and focused via `Tab`
- **WHEN** the user presses `Enter` or `Space`
- **THEN** the chat panel opens with the same behaviour as a click

#### Scenario: prefers-reduced-motion is respected

- **GIVEN** a user agent with `prefers-reduced-motion: reduce` active
- **WHEN** the FAB first renders and on subsequent hover
- **THEN** no `transform`, `scale`, or animation timing functions are applied; the FAB appears in its final position and size immediately

### Requirement: Chat panel rendering and dismissal

`CnAiChatPanel.vue` SHALL render a slide-out panel anchored to the right edge of the viewport (or left edge when `position` resolves to a left variant), occupying a fixed width of `min(420px, 100vw - 32px)` on desktop and full-viewport-minus-header on mobile breakpoints. The panel MUST include three regions:

1. **Header** with the agent display name (or a fallback like `t(appName, 'AI assistant')`), a "Start new chat" button (icon + `aria-label`), a "History" button (icon + `aria-label`), and a "Close" button (icon + `aria-label`).
2. **Message list** rendering `<CnAiMessageList :messages="..." />`.
3. **Input region** rendering `<CnAiInput @send="..." :disabled="isStreaming" />`.

The panel MUST close when the user:
- Clicks the Close (X) button.
- Presses the `Escape` key while focus is within the panel.
- Clicks outside the panel (optional, may be disabled for safety; if enabled, MUST NOT close while text is being typed in the input).

When the panel opens, keyboard focus MUST move into the input region. When the panel closes, focus MUST return to the FAB so keyboard users do not lose their place.

The panel surface MUST use Nextcloud CSS variables only: `var(--color-main-background)`, `var(--color-border)`, `var(--color-primary-element)`, `var(--color-text-maxcontrast)`. Hardcoded colour values MUST NOT appear in component CSS. The component MUST NOT reference `--nldesign-*` variables directly — NL Design overrides flow automatically through Nextcloud's variable indirection.

#### Scenario: Panel opens with focus moved to input

- **GIVEN** the FAB is clicked
- **WHEN** the chat panel transition completes
- **THEN** the `<textarea>` inside `CnAiInput` is the active element (document.activeElement)

#### Scenario: Escape closes the panel and returns focus

- **GIVEN** the chat panel is open and the textarea has focus
- **WHEN** the user presses `Escape`
- **THEN** the panel closes (or starts its close transition), the FAB re-appears, and the FAB receives focus

#### Scenario: Close button closes the panel

- **GIVEN** the chat panel is open
- **WHEN** the user clicks the Close (X) button
- **THEN** the panel closes and the FAB regains focus

### Requirement: Message list rendering

`CnAiMessageList.vue` SHALL accept a `messages` prop (array) and render each entry. The component MUST distinguish at least the three roles `'user'`, `'assistant'`, and `'system'`, applying distinct visual styling (e.g. background, alignment) per role. The component MUST render assistant `tool_calls` and `tool_result` events inline within the message list — collapsed by default to a single-line summary (`t(appName, 'Tool: {toolId}', { toolId })`) and expandable to show JSON arguments and results on click.

Markdown in assistant content MUST be rendered via `NcRichText` (re-exported from `@nextcloud/vue` v8) so existing Nextcloud rendering conventions apply.

User-authored message content MUST be rendered as plain text only (no markdown parsing) to avoid injection surface from user input.

A `tool_result` with `isError: true` MUST be rendered with visually distinct error styling (e.g. red border, `var(--color-error)` accent).

#### Scenario: User and assistant messages render with distinct styling

- **GIVEN** `<CnAiMessageList :messages="[{role:'user', content:'Hi'}, {role:'assistant', content:'Hello!'}]" />`
- **WHEN** the component renders
- **THEN** each message has a different background colour and the user message is right-aligned while the assistant message is left-aligned (or another consistent visual distinction is applied)

#### Scenario: Tool call collapsed and expandable

- **GIVEN** a message containing `tool_calls: [{toolId: 'opencatalogi.searchCatalogues', arguments: {q: 'broker'}}]`
- **WHEN** the component renders
- **THEN** a collapsed single-line summary is shown by default; clicking it expands to reveal the JSON arguments

#### Scenario: Errored tool result renders with error styling

- **GIVEN** a `tool_result` entry with `isError: true` and `result: {error: 'forbidden'}`
- **WHEN** the component renders
- **THEN** the entry has a visible error indicator (`var(--color-error)` border/icon) and the `forbidden` message is readable

### Requirement: Streaming chat composable (useAiChatStream)

`@conduction/nextcloud-vue` SHALL export a `useAiChatStream()` composable from `src/composables/useAiChatStream.js` that owns the conversation transport lifecycle. The composable MUST:

1. Expose reactive state: `isStreaming` (boolean), `currentText` (string, partial assistant text built from `token` events), `toolCalls` (array), `error` (object or null), `messages` (full conversation cache for the current session).
2. Expose methods: `send(content, options)` returns a `Promise` that resolves when the `final` event arrives or rejects when an `error` event arrives; `abort()` cancels the in-flight stream; `startNewThread()` discards current conversation state and tells OR to start a new `Conversation` row on the next send.
3. Attempt the streaming transport first: use the `@microsoft/fetch-event-source` library (MIT, ~3KB minified) against `POST /index.php/apps/openregister/api/chat/stream`. The library handles `POST` body, abort signals, retry-on-disconnect, and SSE frame parsing; it is preferred over the native `EventSource` API because `EventSource` does not support `POST` bodies and over a hand-rolled `fetch()` + `ReadableStream.getReader()` because the library has solved the reconnect/abort edge cases.
4. Handle all six SSE event types from the hydra spec ([SSE streaming envelope on POST /api/chat/stream](https://github.com/ConductionNL/hydra/blob/development/openspec/specs/ai-chat-companion/spec.md)): `token`, `tool_call`, `tool_result`, `heartbeat`, `final`, `error`.
5. Fall back to the non-streaming `POST /index.php/apps/openregister/api/chat/send` (via `axios` from `@nextcloud/axios`) when the streaming endpoint returns 404 / 501 (orchestrator change not yet shipped) or when the library's connection fails. In the fallback case, the composable MUST emit a single synthetic `final` event from the JSON response so message-list rendering code does not need to branch.
6. Send the active `cnAiContext` snapshot as part of the request body so the orchestrator persists it on `Message.context` per the hydra spec's [Per-message context metadata](https://github.com/ConductionNL/hydra/blob/development/openspec/specs/ai-chat-companion/spec.md) requirement.
7. Use `axios` (not `fetch`) for any non-streaming mutation per ADR-004 rules. For SSE specifically, the `@microsoft/fetch-event-source` library satisfies the streaming-primitive role; this is not a "mutation via `fetch`" because the persistence write happens server-side from the SSE handler.

The composable MUST be tree-shake-friendly and MUST NOT side-effect-import any non-essential dependencies at module load.

#### Scenario: Streaming response accumulates tokens

- **GIVEN** an OR backend that returns 14 `token` events followed by one `final` event
- **WHEN** `send('Hello')` is called
- **THEN** `currentText` is updated reactively after each `token` event, the Promise resolves on `final`, and `messages` after resolution contains one user entry and one assistant entry whose `content` equals the concatenated tokens

#### Scenario: Tool call mid-stream surfaces in state

- **GIVEN** an OR backend that emits `token`, `tool_call`, `tool_result`, `token`, `final`
- **WHEN** `send('Search the broker')` is called
- **THEN** `toolCalls` contains an entry with `{ toolId, arguments, result, isError }` populated from the matched `tool_call` and `tool_result` events, and the resolved assistant message in `messages` includes that tool record

#### Scenario: Heartbeat events do not surface to UI

- **GIVEN** a slow tool loop that produces `heartbeat` events every ~15 seconds with no other events in between
- **WHEN** the stream is in progress
- **THEN** `currentText` does not change as a result of heartbeats, `isStreaming` remains `true`, and no `messages` entry is created for the heartbeat

#### Scenario: Error event rejects the send Promise

- **GIVEN** an OR backend that emits one `error` event with `{ code: 'rate_limited', message: 'Try again later' }`
- **WHEN** `send('Hi')` is called
- **THEN** the Promise rejects with an Error whose `.code === 'rate_limited'`, `error.value` reactive state is populated, and `isStreaming` returns to `false`

#### Scenario: Fallback to /api/chat/send when streaming unavailable

- **GIVEN** an OR backend where `/api/chat/stream` returns HTTP 404 (orchestrator change not yet shipped)
- **WHEN** `send('Hi')` is called
- **THEN** the composable issues a `POST /api/chat/send` via `axios`, synthesises a single `final` event from the JSON response, the `send()` Promise resolves with the full assistant message, and `messages` contains user + assistant entries identical in shape to the streaming case

#### Scenario: Abort cancels in-flight stream

- **GIVEN** an in-flight stream that has emitted 3 `token` events
- **WHEN** `abort()` is called
- **THEN** the underlying transport is closed, `isStreaming` flips to `false`, the partial assistant content is discarded from `currentText`, and the `send()` Promise rejects with a cancellation error

#### Scenario: Request body includes cnAiContext snapshot

- **GIVEN** `useAiContext()` returns `{ appId: 'opencatalogi', pageKind: 'detail', objectUuid: 'X', registerSlug: 'catalogus', schemaSlug: 'organisation', route: {...} }`
- **WHEN** `send('Hi')` is called
- **THEN** the outgoing HTTP request body contains a `context` field whose JSON value equals the current `cnAiContext` snapshot

### Requirement: Input region behaviour

`CnAiInput.vue` SHALL render a multi-line `<textarea>` paired with a send button. The component MUST:

- Auto-grow vertically up to a configured max-height (recommend ~6 lines) and then scroll internally.
- Send on `Enter` (no modifier) — emits `send` event with the current text and clears the textarea.
- Insert a newline on `Shift+Enter` without sending.
- Disable the textarea and the send button while `disabled` prop is true (used by the panel to lock input during streaming).
- Show a loading indicator (`NcLoadingIcon` from `@nextcloud/vue`) on the send button when `disabled` is true.
- Apply `aria-label` via `t(appName, 'Message input')` on the textarea and `t(appName, 'Send message')` on the send button.

The send button MUST be disabled when the textarea contains only whitespace.

#### Scenario: Enter sends and clears

- **GIVEN** the textarea contains "Hello there"
- **WHEN** the user presses `Enter` without `Shift`
- **THEN** a `send` event fires with payload `"Hello there"` and the textarea is empty

#### Scenario: Shift+Enter inserts newline

- **GIVEN** the textarea contains "Line one" with cursor at end
- **WHEN** the user presses `Shift+Enter`
- **THEN** no `send` event fires and the textarea now contains `"Line one\n"`

#### Scenario: Disabled state during streaming

- **GIVEN** `<CnAiInput :disabled="true" />`
- **WHEN** rendering completes
- **THEN** the textarea has the `disabled` attribute, the send button shows `NcLoadingIcon`, and pressing `Enter` while focused does nothing

### Requirement: Manual new-thread action

The chat panel header SHALL include a "Start new chat" button that, when activated, calls `useAiChatStream().startNewThread()`. Activating this button MUST:

- Clear the in-memory `messages` state in the composable so the panel renders an empty conversation surface.
- Cause the next `send()` call to instruct OpenRegister to persist subsequent user messages under a fresh `Conversation` row (per hydra spec's "Manual new-thread action creates a new Conversation" scenario).
- Show an empty-state placeholder (e.g. `<NcEmptyContent>`) in the message list area when no messages exist yet.

#### Scenario: Start new chat clears messages and starts fresh thread

- **GIVEN** the panel is open with 4 prior messages visible
- **WHEN** the user clicks "Start new chat"
- **THEN** the message list area shows the empty-state placeholder, and the subsequent `send('Hi')` call's outgoing HTTP body either contains `newThread: true` or otherwise signals to OR that a new `Conversation` row must be created

### Requirement: History browser

The chat panel header SHALL include a "History" button that opens `CnAiHistoryDialog.vue`, a separate `NcDialog`-based component living at `src/dialogs/CnAiHistoryDialog.vue` (per [ADR-004](https://github.com/ConductionNL/hydra/blob/development/openspec/architecture/adr-004-frontend.md) rule: every `NcDialog`-based component lives in its own `.vue` file under `src/dialogs/`). The dialog overlays on top of the chat panel; the chat panel remains mounted underneath, just visually obscured. Closing the dialog (or selecting a conversation) returns focus to the panel.

The dialog SHALL fetch the current user's past conversations from an OR endpoint (`GET /index.php/apps/openregister/api/chat/conversations?limit=50` — most recent 50, no pagination in v1). Clicking a conversation MUST load its messages into the chat panel and resume the thread on subsequent sends, then close the dialog. The dialog MUST handle:

- The empty state ("No conversations yet") with `<NcEmptyContent>`.
- A loading state with `<NcLoadingIcon>` while the conversation list or selected conversation's messages are being fetched.
- An error state when the list fetch fails (rendered with `<NcEmptyContent>` and an error icon).

Conversation list entries MUST display a human-readable title (first user message excerpt or stored title), the relative timestamp of the last message, and a visual indicator for the currently active conversation.

#### Scenario: History dialog opens, lists conversations, loads on click

- **GIVEN** the OR backend has two past conversations for the current user
- **WHEN** the user clicks the History button in the chat panel header
- **THEN** an `NcDialog`-based `CnAiHistoryDialog` overlays the panel with a list of two entries; clicking the older entry loads its messages into the panel via `useAiChatStream`, closes the dialog, and the panel's `send()` resumes that conversation on the next call

#### Scenario: Empty history state

- **GIVEN** the OR backend returns an empty conversation list
- **WHEN** the History dialog renders
- **THEN** an `NcEmptyContent` placeholder with `t(appName, 'No conversations yet')` is shown inside the dialog body

#### Scenario: Dialog dismissal returns focus to panel

- **GIVEN** the History dialog is open
- **WHEN** the user closes it via the X button or Escape key without selecting a conversation
- **THEN** the dialog unmounts, the chat panel remains in its prior state, and keyboard focus returns to the History button on the panel header (WCAG 2.4.3 Focus Order)

### Requirement: Internationalisation for every user-visible string

Every user-visible string in the new components — labels, button text, placeholders, aria-labels, error messages, empty-state titles — MUST be wrapped in `t(appName, '...')`. English keys MUST be the source-of-truth identifiers. Dutch translations MUST be added to `l10n/nl.json` for every English key added to `l10n/en.json`. No string MUST be hardcoded in template or script.

At minimum, the following keys MUST exist in both `l10n/en.json` and `l10n/nl.json`:

- `Open AI chat`
- `AI assistant`
- `Send message`
- `Message input`
- `Start new chat`
- `History`
- `Close`
- `No conversations yet`
- `Connecting...`
- `Loading conversations...`
- `Could not connect to AI service`
- `Tool: {toolId}` (with `{toolId}` placeholder)
- `Reply was cancelled`

#### Scenario: Dutch render of FAB aria-label

- **GIVEN** the consuming app's locale is `nl_NL` and `l10n/nl.json` contains a key for `Open AI chat`
- **WHEN** the FAB renders
- **THEN** the rendered `aria-label` attribute is the Dutch translation, not the English key

#### Scenario: No hardcoded strings in templates

- **GIVEN** any new component shipped in this change
- **WHEN** the source is grep'd for user-visible strings that bypass `t()`
- **THEN** zero matches exist (excluding strings used purely as object keys, type discriminators, CSS class names, or test fixtures)

### Requirement: Accessibility (WCAG AA)

The widget SHALL meet WCAG 2.1 Level AA for keyboard navigation, focus management, and contrast. Specifically:

- Every interactive element (FAB, header buttons, input, send button, history entries) MUST be reachable via `Tab` and activatable via `Enter` / `Space`.
- When the chat panel opens, keyboard focus MUST move to the message-input textarea; when it closes, focus MUST return to the FAB.
- A visible focus ring MUST appear on each interactive element using `var(--color-primary-element)` or `var(--color-primary-element-text)` — the focus ring MUST NOT rely on color alone and MUST be at least 2px outline-equivalent.
- All icon-only buttons MUST have an `aria-label`.
- All text MUST meet WCAG AA contrast against its background using Nextcloud CSS variables.
- Screen readers MUST announce assistant-authored streaming updates politely — the assistant message container MUST have `aria-live="polite"`.

#### Scenario: Keyboard tab order through the panel

- **GIVEN** the chat panel is open
- **WHEN** the user presses `Tab` repeatedly starting from the textarea
- **THEN** focus visits Send button → Close button → History button → Start-new-chat button → message list entries → back to textarea, with a visible focus ring at each stop

#### Scenario: Live region announces assistant streaming

- **GIVEN** the assistant message container is being populated by `token` events
- **WHEN** new tokens append to the rendered text
- **THEN** a screen-reader inspection of the container shows `aria-live="polite"` and the live updates are announced after the stream stops (polite, not assertive)
