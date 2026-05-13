# Design: ai-chat-companion-widget

## Context

This change ships the frontend half of the cross-app AI Chat Companion architecture. The architecture has already been locked upstream:

- **Cross-app contracts (hydra)**: [adr-034-ai-chat-companion.md](https://github.com/ConductionNL/hydra/blob/development/openspec/architecture/adr-034-ai-chat-companion.md) and the archived shared spec at [hydra/openspec/specs/ai-chat-companion/spec.md](https://github.com/ConductionNL/hydra/blob/development/openspec/specs/ai-chat-companion/spec.md).
- **Sibling backend change**: [openregister/openspec/changes/ai-chat-companion-orchestrator](https://github.com/ConductionNL/openregister) — implements `IMcpToolProvider`, the `McpToolsService` discovery refactor, the SSE endpoint, the `Message.context` migration. Runs in parallel with this change; the widget MUST work today against the existing `POST /api/chat/send` and progressively enhance to SSE when the orchestrator ships.

The library today already exposes ~80 components via barrel exports from `src/index.js`. `CnAppRoot` is the well-known wrapper every consuming app mounts at the top of its tree; it already provides `cnManifest`, `cnCustomComponents`, `cnTranslate`, `cnOpenUserSettings`, `cnPageTypes`, `cnIndexSidebarConfig`, `cnHostsIndexSidebar` via Vue 2 `provide()`. The three page wrappers `CnIndexPage`, `CnDetailPage`, `CnDashboardPage` already know the register/schema/object they render — they are the natural place to push reactive `cnAiContext` overrides.

Constraints inherited from the workspace:

- Vue 2.7 Options API only; no Composition API ([adr-004-frontend.md](https://github.com/ConductionNL/hydra/blob/development/openspec/architecture/adr-004-frontend.md)).
- `axios` from `@nextcloud/axios` for non-streaming HTTP; `EventSource` / `fetch` with streaming reader for SSE specifically because `axios` lacks native SSE support.
- CSS classes use `cn-` prefix; only Nextcloud CSS variables, never `--nldesign-*` directly.
- `t()` for every user-visible string; Dutch + English mandatory ([adr-007-i18n.md](https://github.com/ConductionNL/hydra/blob/development/openspec/architecture/adr-007-i18n.md)).
- Modals/dialogs live in their own files under `src/modals/` or `src/dialogs/` per [adr-004-frontend.md](https://github.com/ConductionNL/hydra/blob/development/openspec/architecture/adr-004-frontend.md). The chat panel is a slide-out, not a modal — it lives at `src/components/CnAiCompanion/CnAiChatPanel.vue`.
- Self-contained components per [adr-017-component-composition.md](https://github.com/ConductionNL/hydra/blob/development/openspec/architecture/adr-017-component-composition.md) — consumers MUST NOT wrap them in `CnDetailCard` or similar.

Stakeholders:

- nc-vue maintainers (own this change's PR review).
- OpenRegister team (owns the sibling orchestrator change).
- Per-app maintainers across the 13 consuming apps (downstream — bumping the library version delivers the widget for free).

## Goals / Non-Goals

### Goals

- One mount-everywhere AI surface that every Conduction app inherits by bumping `@conduction/nextcloud-vue`.
- Context-aware: the widget knows what the user is looking at (app, page kind, object UUID, register/schema slugs).
- Streaming UX where available, with graceful fallback to the non-streaming `/api/chat/send` endpoint when the orchestrator change has not yet shipped or when SSE transport fails.
- Zero install-time PHP/composer dependency on OpenRegister induced by upgrading the library — the runtime no-op when OR is unreachable preserves the `mydash`-can-still-use-the-widget invariant.
- WCAG AA accessibility from day one (keyboard navigation, focus management, aria-labels, prefers-reduced-motion).

### Non-Goals

- An agent picker UI — v1 assumes one agent per user (per hydra design.md Open Questions). Future work tracked separately.
- Tool-call drill-down power features beyond the collapse/expand summary.
- Refactoring OpenRegister's existing full-page chat at `src/views/chat/ChatIndex.vue` onto the new primitives. Tracked as [openregister#1459](https://github.com/ConductionNL/openregister/issues/1459) follow-up.
- Per-app `IMcpToolProvider` implementations — those live in each consuming app's repo.
- Conversation export, search across history, or sharing — out of scope for v1.
- Voice input or speech output.

## Decisions

### 1. Auto-mount at CnAppRoot vs explicit opt-in per app

**Decision**: Auto-mount. `CnAppRoot` includes `<CnAiCompanion />` unconditionally as a fixed child of `NcContent`. Gating happens inside the companion (health probe, panel visibility) — not at the wiring layer.

**Rationale**:
- Mirrors the existing pattern for `CnAppNav` / `CnDependencyMissing` already auto-rendered inside `CnAppRoot`.
- Eliminates the per-app "did you remember to mount the FAB?" question — the integration footprint is exactly "bump the library version".
- The companion's silent-fail-on-missing-OR behaviour means apps where OR is not installed see nothing — no surface area for breakage.

**Alternatives considered**:
- *Explicit opt-in via `<CnAiCompanion />` in each app's `App.vue`*: rejected because it duplicates wiring 13 times and is fragile in apps that ship multiple app entry points (most of them).
- *Gated by a `manifest.aiCompanion = true` flag*: rejected as premature configuration — the orchestrator's health probe already governs whether the widget is functional; an extra opt-out boolean adds no value over removing the library bump.

### 2. FAB default position: bottom-right

**Decision**: Default `position: 'bottom-right'` with `right: 24px; bottom: 24px;`. Overridable via prop accepting `'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'`.

**Rationale**:
- Bottom-right is the convention for chat widgets in consumer products (Intercom, Drift, ChatGPT widgets). Users have learned to look there.
- Sufficient distance from Nextcloud's bottom-left status indicators.
- 24px gap follows Nextcloud's standard spacing (`var(--default-grid-baseline) * 3`).
- Override prop covers the edge case where a host app already has a bottom-right action.

**Alternatives considered**:
- *Bottom-left default*: rejected — collides with Nextcloud's "talk to admin" toast and quota indicators in some deployments.
- *Configurable globally via manifest*: rejected — adds config surface for a default that very few apps will need to change.

### 3. Panel UX: slide-out, not modal

**Decision**: A right-edge slide-out panel at width `min(420px, 100vw - 32px)` (full viewport minus header on mobile). NOT a `NcModal` or `NcDialog`. NOT inline in the page layout.

**Rationale**:
- Modal-style chat blocks the content the user wants to ask about — defeats the purpose of an in-context companion.
- Slide-out preserves the page underneath so users can read while chatting.
- Mobile fallback to full-viewport-minus-header is consistent with Nextcloud Talk's mobile chat experience.

**Alternatives considered**:
- *NcModal / NcDialog*: rejected for the reason above.
- *Floating bubble that expands in place*: rejected because the limited footprint hurts message density and accessibility (small focus targets).

### 4. Streaming-with-non-streaming-fallback strategy

**Decision**: `useAiChatStream()` attempts the streaming endpoint first; on `404` / `501` / mid-handshake transport failure it falls back to `POST /api/chat/send` and synthesises a single `final` event from the JSON response so message rendering code does not branch.

**Rationale**:
- The sibling orchestrator change may not be shipped when this widget lands in production. Falling back to the existing endpoint keeps the widget functional during the rollout window.
- Even after the orchestrator ships, Apache + `mod_php` + reverse-proxy buffering can collapse SSE streams ([hydra ADR-034 Negative Consequence #2](https://github.com/ConductionNL/hydra/blob/development/openspec/architecture/adr-034-ai-chat-companion.md)). The fallback ladder is a reliability buffer.
- Synthesising the `final` event in the fallback path means `CnAiMessageList` / state shape has exactly one rendering codepath — simpler tests, simpler code review.

**SSE transport mechanism**: use the `@microsoft/fetch-event-source` library (MIT, ~3KB minified) as the streaming primitive. Native `EventSource` does not support `POST` bodies; a hand-rolled `fetch()` + `ReadableStream.getReader()` would need to re-solve reconnection, abort signal handling, and SSE frame parsing — all of which the library already handles. The library is well-maintained (Microsoft, used by Azure AI / Copilot tooling), explicitly designed for this use case, and ~3KB.

The ADR-004 "no `fetch()` for mutations" rule is satisfied because the actual write (persistence of the user message) happens server-side from the SSE handler — this is a stream-reading call, not a mutation via fetch. For non-streaming mutations (`/api/chat/send`, `/api/chat/conversations/...`), `axios` from `@nextcloud/axios` is used as usual.

**Alternatives considered**:
- *EventSource only, no POST body*: rejected — only supports GET, and we need to POST the message body.
- *Hand-rolled `fetch()` + `ReadableStream.getReader()`*: rejected — we'd be re-implementing reconnect / abort / frame-parsing that the library already battles-tested.
- *Long-poll fallback before non-streaming*: rejected — added complexity for marginal benefit; the non-streaming endpoint is already proven.
- *Pure non-streaming (no SSE attempt)*: rejected — abandons the streaming UX permanently.

### 5. Context push from page components: lifecycle hooks + watch

**Decision**: Each of `CnIndexPage`, `CnDetailPage`, `CnDashboardPage` overrides `cnAiContext` fields in `created()` and registers a `watch` so subsequent prop changes re-push. On `beforeDestroy()` each component resets `pageKind` back to `'custom'` and clears the object/register/schema fields.

**Rationale**:
- Mirrors how the existing `cnIndexSidebarConfig` reactive holder works in `CnAppRoot`.
- `created()` (not `mounted()`) so the companion sees correct context before its first health-probe-gated render.
- The reset on unmount prevents stale context from leaking into custom pages that follow.

**Alternatives considered**:
- *Computed-based push from each page*: rejected — push semantics are clearer than implicit reactivity over a computed.
- *Each page emits an event, `CnAppRoot` listens and writes*: rejected — fragile across slot/router boundaries, more wiring, no benefit.

### 6. Message rendering: NcRichText for assistant markdown, plain text for user

**Decision**: Assistant content rendered via `NcRichText` (re-exported from `@nextcloud/vue` v8); user content rendered as plain text only.

**Rationale**:
- `NcRichText` already powers Nextcloud Talk / Deck / Mail rich content with markdown — consistent UX.
- User content is potentially untrusted input — refusing markdown there closes an injection surface even though Vue's `v-text` would catch most. Plain text is the safer default.
- Tool-call / tool-result rendering is custom (collapsed JSON viewer) — independent of the markdown path.

**Alternatives considered**:
- *Render both via NcRichText*: rejected — unnecessary markdown surface on user content.
- *Custom markdown renderer*: rejected — duplicates `NcRichText`, drifts from Nextcloud conventions.

### 7. History UX: `NcDialog` overlay on top of the chat panel

**Decision**: Clicking the History button in the chat panel header opens `CnAiHistoryDialog.vue` — a separate `NcDialog`-based component living at `src/dialogs/CnAiHistoryDialog.vue` per [ADR-004](https://github.com/ConductionNL/hydra/blob/development/openspec/architecture/adr-004-frontend.md)'s rule that every `NcDialog`-based component lives in its own file under `src/dialogs/`. The dialog overlays on top of the chat panel; the chat panel stays mounted underneath. Selecting a conversation loads its messages into the panel and closes the dialog. Closing the dialog (X or Escape) returns focus to the panel's History button.

**Rationale**:
- Clean separation: the chat panel renders chat; the dialog renders the conversation list. Each component has one job.
- `NcDialog` is the Nextcloud-native pattern for transient picker UIs — keyboard handling (Escape to close), focus trap, and ARIA roles are handled by the upstream component for free.
- ADR-004 dialog-file-isolation rule is satisfied: the dialog lives in its own `.vue` file under `src/dialogs/`, imported and registered by `CnAiChatPanel` as the parent.
- Slightly higher z-index management complexity than an inline switch, but `NcDialog` already owns its z-index layer above standard NC UI.

**Alternatives considered**:
- *Inline replacement of the message-list region inside the panel*: rejected — conflated two roles in one component; the panel's `script` would need branching logic for history-vs-messages state; back-button affordance feels janky next to the message-list scroll behavior; harder to test in isolation.

### 8. Agent selection: deferred to v2

**Decision**: v1 assumes one agent per user. The chat panel header displays an agent name string (from the active conversation's metadata or a fallback `t(appName, 'AI assistant')`) but does NOT render an agent picker. Multi-agent support is tracked in follow-up work.

**Rationale**:
- Hydra design.md leaves this as an Open Question. Resolving it requires UX decisions across all 13 apps — out of scope for this change.
- Single-agent simplifies the storage model and the widget's state.

**Alternatives considered**:
- *Ship a basic picker now*: rejected — risks landing a UX we change later, and we have no data on multi-agent demand yet.

## Reuse Analysis

| Need | Reuses | Notes |
|---|---|---|
| Provide/inject scaffolding | Existing `CnAppRoot` `provide()` block (`cnManifest`, `cnTranslate`, `cnPageTypes`, etc.) | Add one line for `cnAiContext` |
| Page-component context push pattern | Same pattern `CnIndexPage` uses today to publish `cnIndexSidebarConfig` | `created` + `watch` + `beforeDestroy` reset |
| Buttons, modals, loading indicators, avatars, empty states | `NcButton`, `NcModal`, `NcDialog`, `NcLoadingIcon`, `NcEmptyContent`, `NcAvatar` re-exported from `@nextcloud/vue` v8 — DO NOT import directly from `@nextcloud/vue` | All available via `import { NcButton } from '@nextcloud/vue'` already used 80+ times in the library |
| Markdown rendering for assistant content | `NcRichText` from `@nextcloud/vue` v8 | Same component used by Talk/Deck |
| Icons | `vue-material-design-icons` (existing peer dep) | `RobotOutline`, `Send`, `Close`, `History`, `Plus`, `ChevronDown` |
| HTTP for non-streaming calls | `axios` from `@nextcloud/axios` (existing peer dep) | Used everywhere in the library already |
| SSE transport | `@microsoft/fetch-event-source` (new dep, ~3KB, MIT) | Handles POST body + abort + reconnect; `EventSource` won't carry a POST body |
| Translation function | `t()` provided by `CnAppRoot` via `cnTranslate` inject | Pattern used in every existing component |
| Empty state | `NcEmptyContent` from `@nextcloud/vue` | Used for "No conversations yet" |
| CSS variable conventions | Nextcloud `--color-*` variables already used across the library | No new tokens introduced |

**No new dependencies** are introduced. The widget is a pure consumer of existing peer deps + the library's own conventions.

## Seed Data

**N/A** — this is a frontend Vue library change. No schemas are introduced and no JSON seed objects land in `openspec/seed/`. The orchestrator-side `Message.context` field and any default-agent seed work belongs to the sibling [openregister/ai-chat-companion-orchestrator](https://github.com/ConductionNL/openregister) change.

## Declarative-vs-Imperative

**N/A** — [ADR-031](https://github.com/ConductionNL/hydra/blob/development/openspec/architecture/adr-031-declarative-vs-imperative.md) governs schema-level trigger behaviours in OpenRegister. This change ships no schema and no triggers. Conversation persistence and tool dispatch are imperative orchestrator concerns owned by the sibling change.

## File Structure

New files:

```
src/
  components/
    CnAiCompanion/
      CnAiCompanion.vue            # Top-level mount: probe + FAB + panel host
      CnAiCompanion.md             # Component doc
      CnAiFloatingButton.vue       # Round FAB
      CnAiFloatingButton.md
      CnAiChatPanel.vue            # Slide-out panel (NOT a modal)
      CnAiChatPanel.md
      CnAiMessageList.vue          # Message list rendering
      CnAiMessageList.md
      CnAiInput.vue                # Multi-line input + send
      CnAiInput.md
      index.js                     # Barrel re-export
  dialogs/
    CnAiHistoryDialog.vue          # Conversation history browser (NcDialog overlay; ADR-004 requires its own file under src/dialogs/)
    CnAiHistoryDialog.md
  composables/
    useAiContext.js                # Inject reactive cnAiContext
    useAiChatStream.js             # SSE via @microsoft/fetch-event-source + non-streaming fallback transport
examples/
  ai-chat-companion-demo/          # Standalone harness with mock OR backend
    index.html
    main.js
    mocks/
      health.json
      stream-fixtures.js
```

Modified files:

```
src/
  components/
    CnAppRoot/CnAppRoot.vue        # Add cnAiContext provide + <CnAiCompanion /> auto-mount
    CnIndexPage/CnIndexPage.vue    # created + watch + beforeDestroy push for pageKind=index
    CnDetailPage/CnDetailPage.vue  # created + watch + beforeDestroy push for pageKind=detail + objectUuid
    CnDashboardPage/CnDashboardPage.vue # created + watch + beforeDestroy push for pageKind=dashboard
  composables/
    index.js                       # Add useAiContext + useAiChatStream
  index.js                         # Add CnAiCompanion family + composables to barrel
  types/
    index.d.ts                     # Add CnAiContext + composable signatures
l10n/
  en.json                          # Add ~13 new keys
  nl.json                          # Add ~13 new Dutch translations
```

## API Design

This change introduces no new HTTP endpoints — those are owned by [openregister/ai-chat-companion-orchestrator](https://github.com/ConductionNL/openregister). The widget consumes:

### `GET /index.php/apps/openregister/api/chat/health`

Probe endpoint — exists on OR after sibling change ships. Widget treats any non-2xx (including 404 when OR isn't installed) as "render nothing".

### `POST /index.php/apps/openregister/api/chat/send`

Existing non-streaming endpoint. Used as fallback when streaming endpoint unavailable.

Body (relevant additions in this change):
```json
{
  "content": "Hi",
  "context": {
    "appId": "opencatalogi",
    "pageKind": "detail",
    "objectUuid": "00000000-0000-0000-0000-000000000000",
    "registerSlug": "catalogus",
    "schemaSlug": "organisation",
    "route": { "path": "/apps/opencatalogi/catalog/organisations/000...0" }
  },
  "newThread": false
}
```

Response: existing JSON shape. The widget treats this as a synthetic single `final` event.

### `POST /index.php/apps/openregister/api/chat/stream` (SSE — sibling change)

The widget consumes the six-event envelope per [hydra spec / SSE streaming envelope on POST /api/chat/stream](https://github.com/ConductionNL/hydra/blob/development/openspec/specs/ai-chat-companion/spec.md). Implementation uses `@microsoft/fetch-event-source` (MIT, ~3KB minified) which handles POST bodies, abort signals, automatic reconnect, and SSE frame parsing.

### `GET /index.php/apps/openregister/api/chat/conversations`

Conversation list for the current user (sibling change). Used by `CnAiHistoryDialog`. The widget calls with `?limit=50` to fetch the 50 most-recent conversations; no pagination in v1.

### `GET /index.php/apps/openregister/api/chat/conversations/{uuid}`

Single conversation's messages. Used when the user picks a history entry.

## Public API surface (library exports)

New exports from `src/index.js`:

```js
export { default as CnAiCompanion } from './components/CnAiCompanion'
export { default as CnAiFloatingButton } from './components/CnAiCompanion/CnAiFloatingButton.vue'
export { default as CnAiChatPanel } from './components/CnAiCompanion/CnAiChatPanel.vue'
export { default as CnAiMessageList } from './components/CnAiCompanion/CnAiMessageList.vue'
export { default as CnAiInput } from './components/CnAiCompanion/CnAiInput.vue'
export { default as CnAiHistoryDialog } from './dialogs/CnAiHistoryDialog.vue'
export { useAiContext } from './composables/useAiContext.js'
export { useAiChatStream } from './composables/useAiChatStream.js'
```

New types in `src/types/index.d.ts`:

```ts
export interface CnAiContext {
  appId: string
  pageKind: 'index' | 'detail' | 'dashboard' | 'chat' | 'settings' | 'custom'
  objectUuid?: string
  registerSlug?: string
  schemaSlug?: string
  route?: { path: string, name?: string, params?: Record<string, string> }
}
export function useAiContext(): CnAiContext
export interface UseAiChatStreamReturn {
  isStreaming: boolean
  currentText: string
  toolCalls: Array<{ toolId: string, arguments: unknown, result?: unknown, isError?: boolean }>
  error: { code: string, message: string } | null
  messages: Array<{ role: 'user' | 'assistant' | 'system', content: string, toolCalls?: unknown[] }>
  send(content: string, options?: { newThread?: boolean }): Promise<void>
  abort(): void
  startNewThread(): void
}
export function useAiChatStream(): UseAiChatStreamReturn
```

## Security Considerations

- Every request to OR carries the user's session cookie via `axios` defaults — no separate auth path.
- User-authored message content is rendered as plain text (no markdown parser) to close one XSS vector.
- Assistant content runs through `NcRichText` which sanitises HTML and rejects script/style. Same trust model Nextcloud Talk uses.
- Tool-result JSON is rendered inside a `<pre>` / `<code>` block, not interpreted.
- The companion never stores conversation content in `localStorage`; state lives only in component memory and on the server.
- No third-party network calls — all traffic goes to the same-origin OR backend.

## NL Design System

The widget uses Nextcloud CSS variables only. NL Design overrides flow through Nextcloud's variable indirection automatically — apps that ship the nldesign theme get NL-styled FAB, panel, and message bubbles without component changes. No `--nldesign-*` variable is referenced directly. Conformance with [adr-010-nl-design.md](https://github.com/ConductionNL/hydra/blob/development/openspec/architecture/adr-010-nl-design.md) is by construction.

## Risks / Trade-offs

- **[Risk] FAB visible on `CnChatPage` is visually redundant** → `CnAiCompanion` reads `useAiContext().pageKind` and hides the FAB when `pageKind === 'chat'`. Documented in the chat panel rendering requirement and enforced in test.
- **[Risk] SSE through Apache + `mod_php` is unverified at write time** → mitigated by the fallback to `POST /api/chat/send`. The widget works today against the existing endpoint; SSE is opportunistic enhancement.
- **[Risk] SSE-over-fetch browser compatibility** → `@microsoft/fetch-event-source` requires `fetch` + `ReadableStream` (TC39 streams). Modern Chromium / Firefox / Safari all support it. IE 11 is unsupported by Nextcloud 28+ anyway. No additional polyfill burden. The library itself adds ~3KB to the per-app bundle.
- **[Risk] Accessibility regressions on focus-trap and live regions** → mitigated by explicit aria-live="polite" on the assistant message container, explicit focus management on open/close, manual screen-reader smoke test before merge. WCAG AA contrast is by construction (Nextcloud CSS variables).
- **[Risk] Z-index conflicts with custom-mounted modals in consuming apps** → recommended z-index `9000` keeps the FAB below `NcModal`'s `var(--z-index-modal)` (typically 10000+). Documented in the spec.
- **[Risk] Health probe runs once per page-load and apps may install OR mid-session** → acceptable for v1. Apps can hard-reload after install — a rare event.
- **[Trade-off] Single global thread per user-agent** → exposes a "Start new chat" button so users can rotate threads manually. Aligns with hydra spec's "one global thread" design.
- **[Trade-off] Vue 2 Options API only** → the new composables `useAiContext()` and `useAiChatStream()` are plain JavaScript factories that return reactive objects via `Vue.observable()`, not Vue 3 Composition API hooks. Naming follows the "use-" convention for familiarity.
- **[Trade-off] Tool-call expansion UX is intentionally minimal** → power-user tool inspection is deferred. v1 prioritises clean UX for the 90th-percentile user (just-text + occasional tool-call summary).
- **[Trade-off] No conversation export / search in v1** → defer to future work.

## Migration Plan

1. **Implementation lands on a feature branch from `beta`** (per `nextcloud-vue` library branching exception — beta is the active integration branch, not development).
2. PR merged to `beta`; library publishes a new minor version (e.g. `0.next.0`).
3. Sibling [openregister/ai-chat-companion-orchestrator](https://github.com/ConductionNL/openregister) merges and ships its OR release in parallel. Either order is OK because the widget falls back to existing `/api/chat/send` until streaming endpoint is live.
4. First pilot app ([opencatalogi#549](https://github.com/ConductionNL/opencatalogi/issues/549)) bumps `@conduction/nextcloud-vue` to the new version; integration is the bump + no other change.
5. Remaining 12 apps bump on their normal release cadence.
6. Health probe ensures apps without OR installed (or with OR but no orchestrator change yet) get a silent no-op — no breakage.

### Rollback

- Library: bump consuming apps back to the previous `@conduction/nextcloud-vue` version. No data migration, no schema change in this library, no destructive effects.
- The change is additive to `CnAppRoot` and the three page wrappers — reverting the PR is mechanically safe.

## Open Questions

1. **Health probe caching window**: cache for current page-load only, or also persist in `sessionStorage` to avoid probe-thrash on internal navigation? *Provisional decision*: in-memory cache for the lifetime of the `CnAppRoot` component instance. Revisit if probe traffic shows up in OR metrics.
2. **FAB visibility on `CnFormPage` and `CnLogsPage`**: should the FAB hide on those page kinds too? *Provisional decision*: no — the user might want AI help filling a form. Only `pageKind === 'chat'` hides the FAB.
3. **Tool-call payload size limits**: large tool results (multi-MB JSON) could bloat the DOM. *Provisional decision*: truncate JSON viewer at ~10 KB with "Show more" affordance. Concrete threshold tuned during implementation.
4. **Internationalisation key for tool descriptions**: tool `description` strings come from OR provider implementations — they are server-authored. Render as-is or run through `t()`? *Provisional decision*: render as-is. Per-app providers own their tool descriptions; library does not translate server-authored copy.
5. **Mobile keyboard handling**: on mobile, the soft keyboard pushes the input region above the message list — does the message list need a scroll-into-view on each new token? *Provisional decision*: yes, scroll-into-view on every `token` event when the panel's scroll position is within ~64px of the bottom (sticky-bottom pattern). Refine during mobile smoke test.
6. **Conversation history pagination**: how many conversations to fetch initially? *Provisional decision*: 50 most-recent. Pagination affordance deferred to follow-up if needed.
