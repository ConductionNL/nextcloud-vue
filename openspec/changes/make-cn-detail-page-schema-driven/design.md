## Context

The library's manifest renderer (`CnPageRenderer` + `CnAppRoot` + `defaultPageTypes`) treats four page types as built-ins: `index`, `detail`, `dashboard`, `logs`, `settings`, `chat`, `files`, `form`, `wiki`, `map`. Of those, only `index` (via `CnIndexPage`) and `logs` (via `CnLogsPage`) are *schema-driven*: declare `register`+`schema` in the manifest, the component fetches, the component renders. `detail` (via `CnDetailPage`) is not — it's a generic layout shell expecting the caller to wire fetch + content + sidebar.

Browser-verified consequence (openbuilt `VirtualAppDetail`, 2026-05-13): a manifest entry of

```json
{ "id": "VirtualAppDetail", "route": "/applications/:objectId", "type": "detail",
  "title": "Virtual app",
  "config": { "register": "openbuilt", "schema": "application",
              "sidebarTabs": [...], "actionsComponent": "ApplicationDetailActions" } }
```

renders a blank page — header empty, body empty, sidebar inert. The DOM still contains the structural divs (`cn-detail-page__header`, `cn-detail-page__body`) and the route resolves correctly (`name: VirtualAppDetail`, `params: {objectId: '...'}`), but no content fills them because:

- `CnPageRenderer.resolvedProps` returns `{...page.config, ...$route.params}` — `page.title/description/icon` are top-level on the manifest, never forwarded.
- `CnDetailPage` declares neither `register` nor `schema` nor `sidebarTabs` as props. Vue 2 falls through unknown attrs to the root element, hence the visible `sidebartabs="[object Object]..."` on the rendered DOM.
- `CnDetailPage` has no object-fetch path. The `setup()` block only wires `useObjectSubscription` + `useObjectLock` *when* the caller pre-passes `objectStore`+`objectType`+`objectId`. The manifest doesn't pre-pass those — and they'd be the wrong shape anyway (manifest uses `register`+`schema`, not the concatenated `objectType`).

This change closes that gap. The implementation lives in three SFCs and three doc pages — no new components, no new public APIs beyond the three new props on `CnDetailPage`.

Constraints:
- Vue 2.7 Options API across the board (existing `CnDetailPage` mixes Options + a small `setup()` block for composables; we keep that shape).
- ADR-017 forbids inline `CnObjectSidebar` inside `NcAppContent`; the sidebar must live at `NcContent` level. `CnDetailPage` already publishes to `objectSidebarState` via inject — we just have to feed the new `sidebarTabs` into that state, and add the matching auto-mount in `CnAppRoot`.
- ADR-022 forbids axios in components; fetch must flow through `useObjectStore` (the same path `CnIndexPage`/`CnLogsPage` use).
- Backwards-compat: every existing `CnDetailPage` consumer (call sites in OpenRegister, OpenCatalogi, Procest, Pipelinq, MyDash, decidesk, openbuilt itself for non-manifest routes) must keep working unchanged.

## Goals / Non-Goals

**Goals:**

- Make `type: "detail"` end-to-end functional from manifest alone: header from `page.title`, object data from `register`+`schema`+`objectId`, sidebar tabs from `config.sidebarTabs`.
- Mirror `CnIndexPage`'s schema-driven contract on the detail surface (props, store wiring, ADR-017-compliant sidebar hoist) so future apps copy one symmetric pattern.
- Keep the change additive — no removed props, no reordered prop precedence, no slot semantics changed.
- Land one Vue-library PR that openbuilt and every other manifest-using consumer can adopt without code changes on their side beyond a (one-time) `CnAppRoot` re-render.

**Non-Goals:**

- Reworking `CnDetailPage`'s grid-layout mode (`layout` + `widgets` props) — the schema-driven mode is a third orthogonal mode, not a replacement.
- Implementing edit-in-place / inline-form behavior — the auto-rendered `CnObjectDataWidget` already handles dirty tracking + save via the object store; this change only triggers it.
- Defining new sidebar-tab types beyond what `CnObjectSidebar` already supports (`{type: "data" | "metadata" | "audit-trail" | ...}` and `{component: "<RegistryName>"}`).
- Per-app migrations — each consuming app's manifest already declares `type: "detail"`; once this PR lands their existing manifests start working.
- Adding a back-button / breadcrumb to `CnDetailPage` — that's an existing-or-future concern, not in scope.

## Decisions

### Decision 1 — `register`+`schema` props on `CnDetailPage`, not a fused `objectType`

`CnDetailPage` already has an `objectType` prop (used for subscription + lock). The manifest sends `register` + `schema` separately. We could either (a) require manifest authors to fuse them (`"objectType": "openbuilt-application"` in config), or (b) accept them separately and fuse internally.

We pick (b): add `register: String` + `schema: String` props and derive `resolvedObjectType` internally as `objectType || (register && schema ? \`${register}-${schema}\` : '')`. Rationale:

- Matches `CnIndexPage`'s prop shape exactly — manifest authors write the same `{register, schema}` for both surfaces, and the library handles the joining convention.
- Avoids requiring every manifest entry to repeat the join — manifests stay readable.
- Single-source-of-truth: the store's `registerObjectType(slug, schemaId, registerId, slugs)` signature is internal; manifests shouldn't have to know it.
- Falling back to the explicit `objectType` prop keeps all existing direct-mount consumers (which pass `objectType` today) working with zero changes.

Alternative considered: only accept `objectType`. Rejected because it pushes the join convention into every manifest and creates an inconsistency with `CnIndexPage`.

### Decision 2 — Fetch path = `useObjectStore` (mirrored from `CnIndexPage`/`CnLogsPage`)

The schema-driven mode lazy-resolves `useObjectStore()` (or the explicit `objectStore` prop), calls `registerObjectType(slug, schemaId, registerId, { registerSlug, schemaSlug })` to seed the store's collection map, then `fetchObject(slug, objectId)` for the single object.

Rationale:

- ADR-022 mandates this path.
- `CnIndexPage` recently learned the 4-arg `registerObjectType` signature (slug, schemaId, registerId, slugs) — re-using it here keeps the store contract symmetric and avoids drift.
- The fetched object lives in the store, not in local component state, which means cross-component reactivity (sidebar widgets, locked-banner, child views) all see the same data without a second fetch.
- `subscribe: true` keeps live updates working in schema-driven mode for free (existing `useObjectSubscription` setup() block).

Alternative considered: have CnDetailPage fetch with a one-off composable that bypasses the store. Rejected — duplicates state, breaks the subscription path, contradicts ADR-022.

### Decision 3 — Auto-body renders `CnObjectDataWidget` + `CnObjectMetadataWidget` when slot is empty

Per the earlier choice ("data + metadata widgets" auto-body). Implementation: a computed flag `hasDefaultSlotContent` checks `$slots.default && $slots.default.some(vnode => !vnode.text || vnode.text.trim() !== '')`. When the flag is false AND `currentObject` is loaded AND `resolvedObjectType` + `objectId` are present, render the two widgets stacked in the body.

Rationale:

- Matches what every manifest detail page wants out of the box (the manifest itself already declares `widgets: [{type: "data"}, {type: "metadata"}]` in the sidebar tabs — surface promotes the main one too).
- Existing consumers passing slot content keep their content unchanged (slot wins).
- Two single-purpose widgets stay tree-shake-friendly via the existing `defineAsyncComponent` infrastructure — but `CnObjectDataWidget` + `CnObjectMetadataWidget` are already bundled in the library's main entry, so this is more a code-style note than a bundle-size one.

Alternative considered: only data widget; only metadata widget; none (force a slot). The "force a slot" path makes the manifest-only contract a lie — every app has to ship a custom view. Rejected.

### Decision 4 — Sidebar tabs flow through `objectSidebarState` (ADR-017), `CnAppRoot` auto-mounts `CnObjectSidebar`

`CnDetailPage`'s existing `syncSidebarState()` watcher already mutates the injected `objectSidebarState` holder. We extend it to also write `tabs: this.sidebarTabs`, `register`, and `schema` onto the holder. `CnAppRoot` grows a new sibling component next to the existing `cnIndexSidebarConfig` hoist:

```vue
<CnObjectSidebar
    v-if="objectSidebarState.active"
    :tabs="objectSidebarState.tabs"
    :object-type="objectSidebarState.objectType"
    :object-id="objectSidebarState.objectId"
    :title="objectSidebarState.title"
    :subtitle="objectSidebarState.subtitle" />
```

The host App's `#sidebar` slot still wins when consumer-supplied (consumer slot content > auto-mount fallback) — same precedence model as the `cnPageSidebarComponent` hoist.

Rationale:

- ADR-017 compliance — sidebar mounts at NcContent level.
- Symmetric with `cnIndexSidebarConfig` — one mental model, two channels.
- Zero per-app wiring — manifest-only apps work.
- Existing apps that explicitly mount `<CnObjectSidebar>` in their `#sidebar` slot keep working (slot wins).

Alternative considered: inline sidebar in `CnDetailPage` (violates ADR-017); leave the auto-mount out and force each app to add `<CnObjectSidebar>` themselves (boilerplate spread across the fleet). Both rejected.

### Decision 5 — `CnPageRenderer.resolvedProps` forwards `title`/`description`/`icon` from `page`, not just `config`

Current behavior:

```js
resolvedProps() { return { ...page.config, ...$route.params } }
```

New behavior:

```js
resolvedProps() {
  return {
    title: page.title,
    description: page.description,
    icon: page.icon,
    ...page.config,
    ...$route.params,
  }
}
```

Top-level fields are *defaults*; `config.*` can override them; `$route.params` always wins.

Rationale:

- The manifest schema already documents `title`/`description`/`icon` as top-level page fields — they're meant for the header. Not forwarding them is just a missed wire.
- Putting them *before* `config.*` keeps current behavior for any page that today specifies `config.title` (override still wins).
- Tiny, additive, single-file edit.

Alternative considered: require manifests to move title into config. Rejected because every existing manifest entry would have to be edited.

## Risks / Trade-offs

- **[Risk]** `useObjectStore.fetchObject` signature drift between OR versions causing the schema-driven mode to silently 404 → **Mitigation**: mirror `CnIndexPage`'s exact `registerObjectType` + `fetchCollection` lifecycle; reuse the same try/catch + `loading`/`error` flags. Schema-driven mode is gated on `register`+`schema` being set, so apps that don't opt-in see no behaviour change even if the store layer regresses.
- **[Risk]** Apps currently rendering `<CnObjectSidebar>` inside their `#sidebar` slot would get the auto-mount on top, creating two stacked sidebars → **Mitigation**: the auto-mount lives next to the `#sidebar` slot, not inside it; `objectSidebarState` is a single source of truth, so even if both are rendered they read identical state — but to avoid double-render the auto-mount checks `!$slots.sidebar?.length` (or equivalent slot-content guard) before rendering. Documented in the migration note.
- **[Risk]** The auto-body widgets show up in unexpected places — e.g. a consumer mounts `CnDetailPage` for a non-OR view → **Mitigation**: the auto-body only fires when `register`+`schema`+`objectId` are *all* set AND the default slot is empty AND `currentObject` resolved successfully. Apps not opting into the schema-driven mode never see it.
- **[Trade-off]** Three SFCs change in one PR (CnDetailPage, CnPageRenderer, CnAppRoot) → larger diff, but the three are tightly coupled to the manifest contract — splitting them produces two intermediate states where the manifest doesn't fully work.
- **[Risk]** Existing tests for `CnDetailPage` may assume an empty default slot renders nothing → **Mitigation**: the auto-body's gating condition includes `register`+`schema`+`objectId` being set; tests that mount `CnDetailPage` without those (which is every current test) keep their empty-body expectation.

## Migration Plan

1. Land this change on a feature branch off `beta` (per the `nextcloud-vue-uses-beta-branch` memory).
2. `npm test`, `npm run check:docs`, `npm run check:jsdoc`. New tests for the schema-driven path + title/description/icon forwarding + auto-mount must pass.
3. PR to ConductionNL/nextcloud-vue against `beta`. Self-review-approve + merge per the user's authorisation for nc-vue PRs.
4. Bump the openbuilt `package.json` dep on `@conduction/nextcloud-vue` to the new beta tag.
5. Rebuild openbuilt, redeploy to the dev container, browser-verify `/applications/<objectId>` renders: header (title=Hello World, description=app desc, icon), body (data widget showing manifest, metadata widget), right sidebar with Overview / Manifest / Version history / Diff / Audit tabs.
6. Sweep the fleet — every app already on the manifest pattern (decidesk, mydash, openbuilt, plus the in-flight journeydoc rollouts) inherits the behaviour. No per-app code change required; per-app `npm i` + redeploy is enough.
7. Rollback: revert the PR. Detail pages return to the current blank-body state. No data or state migration needed.

## Open Questions

- Should the auto-rendered `CnObjectDataWidget` be in edit-mode by default or read-only? **Default to read-only with a "Edit" button on the header actions** — matches the current `CnObjectDataWidget` default. Actions are wired via the existing `actionsComponent` slot. Confirmed by current behaviour; no design choice required here.
- Should `sidebarTabs` empty-array suppress the sidebar entirely, or render the default tabs? **Empty array suppresses; missing key falls back to `objectSidebarState.tabs = undefined` and `CnObjectSidebar`'s default tab set**. Documented in the spec.
- Future: hoist a similar auto-mount for `CnLogsPage`'s page-level sidebar? Out of scope — `CnLogsPage` doesn't have a sidebar today, this stays a future spec.
