## Context

`@conduction/nextcloud-vue` renders Conduction apps from a JSON manifest via `CnAppRoot` → `CnPageRenderer` → per-slot `CnWidgetGrid`. The prior change (`manifest-delta-merge-and-flex-columns`, **shipped**) added the data layer for partial manifest edits:

- `mergeManifestDelta(base, delta)` / `diffManifest(base, edited)` pure utils (`src/utils/`).
- An optional stable `widgetEntry.id` (the merge key for `widgets[]`).
- An opt-in `mergeStrategy:'delta'` path in `useAppManifest` / `useRuntimeManifest`.
- `resolveSlotColumns(slotName, slotColumns, propColumns)` + `page.config.slotColumns` + a `CnWidgetGrid.columns` prop.

What is missing is a **user surface**. Today a person cannot move a widget, add a KPI, relabel a menu item, or hide a sidebar tab without editing JSON or leaving for OpenBuild's separate editor. This change adds a universal **in-app edit mode** driven entirely by those utilities, surfaced as a single Conduction-orange "OpenBuild" button that appears on every page — but **only when OpenBuild is reachable by the current user**.

Grounding in the real code:
- **Refresh** is a page-level control. On dashboards it lives in `CnDashboardPage`'s header next to the Edit/Done toggle (lines ~29-66) inside `CnActionsMenu` (`refresh-channel="cn:page:refresh"`). On detail pages `CnActionsMenu` carries the same Refresh entry. The new orange button sits **to the right of that refresh control**. `CnActionsBar` also owns a Refresh entry for index lists.
- **GridStack** already exists in `CnDashboardGrid` with an `editable` prop (`.enable()`/`.disable()` on watch) and a `@layout-change` emit. `CnWidgetGrid` is **CSS-grid only** today and renders manifest `body`/`sidebar`/`tab:*` slots; widgets carry `gridX/Y/W/H`, and column resolution now flows through `resolveSlotColumns` + the injected `cnSlotColumns`.
- **Gating** is read from `useAppStatus('openbuild')`. `OC.appswebroots` lists only apps enabled-and-reachable for the current user, so `enabled === true` means "this user has OpenBuild access" — no per-user role endpoint needed.
- **Manifest reactivity:** `CnAppRoot` holds the manifest ref (from `useAppManifest`) and `provide()`s `cnManifest`; `CnPageRenderer` holds `currentPage` and provides `cnSlotColumns` / `cnDetailObjectContext` reactively via getters.
- **Modal isolation (ADR-004):** every `NcModal` must live in its own file under `src/modals/` (the directory does not exist yet — this change creates it).

## Goals / Non-Goals

**Goals:**
- A single OpenBuild-orange icon button on every page type (index / detail / dashboard / custom), to the right of refresh, rendered only when `available`.
- An edit-mode state machine (base + deep-cloned working copy + `editing` flag + dirty tracking) whose `save()` computes `diffManifest(base, working)` and emits/persists the **delta** — not a blob.
- Drag/resizable `body`-slot widgets in edit mode, reusing the GridStack engine, mutating the working copy's `gridX/Y/W/H` and respecting `resolveSlotColumns`.
- Isolated `CnEditMenuModal` and `CnEditSidebarModal` that mutate the working copy's `menu[]` and `page.config.sidebar`.
- The library stays **OpenBuild-agnostic**: `available` is a boolean prop; the gating composable lives separately and reads `useAppStatus`.

**Non-Goals:**
- The persistence endpoint / storage of `baseRef + delta` — owned by the OpenBuild change. This change emits `@save(delta)` or calls an injected `persist(delta)`.
- `CnAddWidgetModal` itself — delivered by the sibling `cn-widget-library` change; this change only adds the (edit-mode-gated) "Add widget…" menu entry that opens it.
- A per-user role/permission endpoint for gating — "anyone with OpenBuild access" via `OC.appswebroots` is the decision.
- Concurrent-edit conflict resolution beyond optimistic last-write-wins (see Risks).
- Editing widget *props* / data-binding (only layout, menu, sidebar in this phase; per-widget config is the widget-library's concern).

## Decisions

### D1 — Base vs working-copy edit-mode state in `useManifestEditor`
**Choice:** A composable holds `base` (a reference to the live rendered manifest), a deep-cloned `working` copy created on entering edit mode, an `editing` flag, and a `dirty` computed (`!deepEqual(base, working)` — or a mutation counter). Entering edit mode clones; `save()` runs `diffManifest(base, working)` and emits the delta; `cancel()` discards `working`. While `editing`, `CnPageRenderer` renders from `working`, not `base`.
**Why:** A working copy makes Cancel free and keeps the rendered base untouched until Save. Diffing base↔working on Save yields exactly the minimal delta the shipped `mergeManifestDelta` consumes, so the persisted artifact is a delta (enabling OpenBuild's `baseRef + delta` storage) rather than a frozen blob.
**Mechanism (Vue 2.7):** `useManifestEditor` is a composable returning refs; `CnAppRoot` instantiates it and `provide()`s an `cnManifestEditor` holder so `CnPageRenderer`, the button, and the modals all read/mutate the same `working` ref. Deep clone via `structuredClone` with a JSON fallback (manifests are plain JSON-serialisable).

### D2 — Render-from-working swap is at `CnPageRenderer`/`CnAppRoot`, switched by `editing`
**Choice:** When `editing` is true, the manifest source feeding `currentPage` / `menu[]` / slot widgets is `working`; otherwise it is `base`. The swap is a single computed `activeManifest = editing ? working : base` provided as `cnManifest`.
**Why:** One switch point keeps every descendant (nav, grids, sidebar) consistent and reactive — no descendant needs to know about edit mode except the grid (drag) and the button (menu). Avoids scattering `editing` checks.

### D3 — Editable body grid reuses GridStack via a new `CnWidgetGrid` edit mode
**Choice:** Add an `editable` mode to `CnWidgetGrid`. When `editable` is false (default) it renders today's CSS grid unchanged. When true **for the `body` slot**, it mounts a GridStack instance (the same engine `CnDashboardGrid` uses) configured with `column = resolveSlotColumns(...)`, makes items draggable/resizable, and on `change` writes the new `gridX/Y/W/H` back into the corresponding `working` widget entry (matched by `widget.id`, falling back to index for id-less entries).
**Why:** Reusing the proven GridStack integration avoids a second drag engine and inherits its column/cell-height behaviour. Scoping the draggable mode to `body` keeps `sidebar` (1 col) and `tab:*`/`section:*` slots as static CSS grids in v1, matching where layout editing is meaningful.
**Alternative considered:** Extract `CnDashboardGrid` and reuse it verbatim inside `CnWidgetGrid`. Rejected for v1 — `CnDashboardGrid` assumes a flat `layout[]` and a `#widget` slot, while `CnWidgetGrid` resolves widget *components* from the registry; an `editable` branch inside `CnWidgetGrid` is less invasive. The GridStack init code is shared via a small `useGridStack` helper to avoid duplication.
**Risk handled:** GridStack manipulates the DOM; in a CSS-grid slot the two layout systems must not both run. The `editable` branch renders a `.grid-stack` container *instead of* the CSS grid (`v-if`/`v-else`), so only one engine is live at a time.

### D4 — OpenBuild-agnostic gating seam
**Choice:** `CnOpenBuildEditButton` exposes an `available` (alias `canEdit`) boolean prop and renders nothing when false. A separate thin composable `useOpenBuildEditAvailability()` calls `useAppStatus('openbuild')` and returns its `enabled` ref; `CnAppRoot` uses it to set `available`. The button file never imports `useAppStatus` or references OpenBuild beyond its own glyph.
**Why:** Keeps the component pure and unit-testable (pass `available` directly), and isolates the one place that knows "OpenBuild = openbuild app id". `OC.appswebroots` already honours NC group restrictions, so `enabled` faithfully means "installed, enabled, and reachable by this user" — the agreed gating rule, with no extra endpoint.

### D5 — Action menu is an `NcActions` opened by the button, not the page overflow menu
**Choice:** The orange button is its own `NcActions` trigger (custom orange icon) with items: **Edit page / Save page** (toggle), **Add widget…** (disabled unless `editing`), **Edit menu…**, **Edit sidebar…**. It is a sibling of the existing page overflow `CnActionsMenu`, placed to its right, not merged into it.
**Why:** The OpenBuild menu is a distinct, brand-colored affordance whose visibility is gated independently of the always-present Refresh/Docs/Request-feature menu. Keeping it separate avoids entangling its gating with `CnActionsMenu` and lets it carry the orange identity. "Add widget…" disabled-unless-editing is enforced in the menu item, not by hiding it, so the affordance is discoverable.

### D6 — Modals are isolated and mutate the working copy in place
**Choice:** `CnEditMenuModal` and `CnEditSidebarModal` live under `src/modals/` (new dir), each a single `NcModal`-based file (ADR-004). They receive the relevant slice of `working` (`menu[]` / `page.config.sidebar`) and mutate it directly (the working copy is throwaway until Save). All `NcSelect` usages carry `inputLabel` (ADR-004 nc-input-labels).
**Why:** Modal isolation is a hard gate. Mutating `working` in place means Save's `diffManifest` automatically captures menu/sidebar edits alongside grid edits in one delta — no separate plumbing per editor.

### D7 — Save emits a delta; persistence is injected, not owned
**Choice:** `save()` computes `delta = diffManifest(base, working)` and (a) emits `@save(delta)` from `CnOpenBuildEditButton`/`CnAppRoot`, and (b) if an `cnPersistManifestDelta` function is injected, calls it. On success the editor adopts `working` as the new `base` and clears `editing`/`dirty`.
**Why:** The library must not bind to OpenBuild's storage. Emitting the delta keeps the contract identical whether OpenBuild persists client-side (POST) or the server resolves `baseRef + delta`. Adopting `working` as `base` after a successful save keeps subsequent diffs minimal.

### D8 — Conduction-orange styling
**Choice:** The button uses `color: var(--c-orange-knvb, #F36C21)` for its glyph/accent; the glyph is a library-bundled copy of `openbuild/img/app.svg` shipped at `src/img/openbuild.svg` (the lib must not depend on the OpenBuild app being installed to render its own button icon).
**Why:** Brand recognition for the OpenBuild affordance; bundling the glyph keeps the library self-contained. `--c-orange-knvb` is the documented Conduction orange token with a hard hex fallback for instances that do not define it.

## Risks / Trade-offs

- **Concurrent edits / lost updates** — two users (or a base-app upgrade) editing the same manifest could clobber each other on Save. *Mitigation:* `save()` diffs against the `base` captured at edit-entry; the persisted artifact is a *delta* (keyed by id), so it re-applies cleanly over a drifted base via `mergeManifestDelta`, and orphaned patches are surfaced (the shipped `orphanedDeltaPaths`). True conflict UX is deferred to the OpenBuild change.
- **Manifest reactivity** — swapping `cnManifest` between `base` and `working` must trigger re-render of nav/grids/sidebar. *Mitigation:* the swap is a single computed feeding the existing reactive `provide()` getters (`cnManifest`, `cnSlotColumns`); descendants already track these reactively (proven by the prior change). Deep-clone with `structuredClone` keeps `working` independently reactive.
- **GridStack inside CSS-grid slots** — running GridStack and the CSS grid simultaneously corrupts layout. *Mitigation:* D3's `v-if`/`v-else` ensures exactly one engine renders per slot; `editable` is scoped to `body`.
- **id-less widgets can't be diffed granularly** — entries without `widgetEntry.id` fall back to whole-array replace in `diffManifest` (the prior change's documented behaviour). *Mitigation:* grid drag matches by id when present, index otherwise; a backfill codemod (prior change's migration) enables fine-grained deltas.
- **Button on every page** — risk of clutter / accidental edits. *Mitigation:* gated on `available`; edit mode is explicit (Edit page → Save page); destructive menu/grid actions only mutate the throwaway working copy until Save.
- **`--c-orange-knvb` undefined on stock instances** — *Mitigation:* hard `#F36C21` fallback in the `var()`.

## Migration Plan

1. Ship `src/img/openbuild.svg` + `CnOpenBuildEditButton` (renders only when `available`) + `useManifestEditor` + `useOpenBuildEditAvailability` — all additive, default-off.
2. Add the `editable` mode to `CnWidgetGrid` (default false → no behaviour change) and the render-from-working swap in `CnPageRenderer`/`CnAppRoot`.
3. Ship `CnEditMenuModal` + `CnEditSidebarModal` under `src/modals/`.
4. Wire `@save(delta)` / `cnPersistManifestDelta`; the OpenBuild persistence change consumes it.
5. The "Add widget…" entry lands disabled-unless-editing and is fully functional once the sibling `cn-widget-library` ships `CnAddWidgetModal`.

**Rollback:** Remove the button mount + the `editing` swap; `CnWidgetGrid.editable` defaults to false, so the CSS-grid render path is unchanged. No data migration — deltas are additive and the optional `widgetEntry.id` is harmless if unused.

## Open Questions

- Should edit mode persist per-page or per-app (one Save commits the whole working manifest, or only the active page's slice)? *Lean:* whole working manifest, since menu/sidebar edits are app-level; `diffManifest` already yields a minimal delta either way.
- Where does the canonical persist run — client POST of the delta, or server resolution of `baseRef + delta`? *Deferred to the OpenBuild change*; the emitted delta is the contract either way.
- Should `available` also require an explicit per-app opt-in flag (e.g. `manifest.editing.enabled`) in addition to OpenBuild reachability? *Lean:* reachability alone for v1; add a manifest opt-out later if apps want to suppress it.
