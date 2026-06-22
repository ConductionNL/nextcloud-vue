## Why

`@conduction/nextcloud-vue` renders every Conduction app from a JSON manifest, but there is **no in-app way to edit that manifest**. A user who wants to move a widget, add a KPI, relabel a menu entry, or hide a sidebar tab must hand-edit JSON or rebuild the app in OpenBuild's separate editor. The prior change (`manifest-delta-merge-and-flex-columns`) shipped the *data plumbing* for partial edits — `mergeManifestDelta`, `diffManifest`, the stable `widgetEntry.id`, and the opt-in `mergeStrategy:'delta'` loader path — but nothing surfaces that plumbing to the user.

This change is **phase 2**: a universal, in-place **edit mode** for any manifest-rendered page, surfaced as a single Conduction-orange "OpenBuild" button that appears on every page **only when OpenBuild is reachable by the current user**. It turns the delta utilities into a live editing experience (drag widgets, edit the menu, edit the sidebar) and computes the delta to persist on Save — without coupling the library to OpenBuild itself.

## What Changes

- **New `CnOpenBuildEditButton` component** — a Conduction-orange (`#F36C21` / `var(--c-orange-knvb)`) icon button carrying the OpenBuild glyph, rendered to the **right of the page-level refresh control** on every `CnPageRenderer` page (index / detail / dashboard / custom). It renders **only** when its `available` prop is `true`, and opens an action menu. The library stays OpenBuild-agnostic — it never imports OpenBuild; `available` is a plain boolean prop.
- **The button's action menu** — items: **Edit page / Save page** (a toggle that enters and persists edit mode), **Add widget…** (opens `CnAddWidgetModal`, delivered by the sibling `cn-widget-library` change — **disabled unless the page is in edit mode**), **Edit menu…** (`CnEditMenuModal`), **Edit sidebar…** (`CnEditSidebarModal`).
- **New `useManifestEditor` composable** — holds the base manifest plus a deep-cloned **working copy**, an `editing` flag, dirty tracking, and a `save()` that computes `diffManifest(base, working)` and emits `@save(delta)` / calls an injected persist function. Cancel discards the working copy. Reuses the shipped `diffManifest` / `mergeManifestDelta` utilities.
- **Editable body grid** — in edit mode the active page's `body`-slot widgets become drag/resizable. The GridStack engine already in `CnDashboardGrid` (`editable` prop, `@layout-change`) is reused via an **edit-aware mode added to `CnWidgetGrid`**; drag/resize mutates the working copy's `page.widgets[]` `gridX/gridY/gridWidth/gridHeight`, respecting the flexible `slotColumns`/`columns` resolution from the prior change.
- **New `CnEditMenuModal`** — add / remove / reorder / relabel / re-icon / re-route menu entries and their children, mutating the working copy's `manifest.menu[]`. Isolated modal file under `src/modals/` (ADR-004 modal-isolation).
- **New `CnEditSidebarModal`** — edit the active page's sidebar (`page.config.sidebar` tabs, visibility), mutating the working copy. Isolated modal file under `src/modals/`.
- **Mounting wiring** — `CnPageRenderer` (or `CnAppRoot`) surfaces the button uniformly on every page type, immediately to the right of refresh, gated on `available`. A thin wiring composable reads `useAppStatus('openbuild').enabled` to derive `available`; the gating decision is **"anyone with OpenBuild access"** (`OC.appswebroots` already reflects NC group-restrictions, so `enabled` means *installed, enabled, and reachable by this user*). No per-user role endpoint.
- **No BREAKING changes.** The button is absent when OpenBuild is unavailable; apps that do not opt into edit mode see no behaviour change; `CnWidgetGrid` stays CSS-only unless its new edit mode is activated.

## Capabilities

### New Capabilities

- `cn-openbuild-edit-shell` — the `CnOpenBuildEditButton`, its action menu, the `useManifestEditor` edit-mode/working-copy/save state, the `CnEditMenuModal` and `CnEditSidebarModal`, the OpenBuild-agnostic `available` gating seam, and the per-page-type mounting contract.

### Modified Capabilities

- `grid-widget-system` — `CnWidgetGrid` gains an edit-aware/draggable mode for its `body` slot (GridStack-backed) that mutates widget `gridX/Y/W/H` against the resolved `slotColumns`/`columns`. (Spec lives at `openspec/specs/grid-widget-system/spec.md`.)

## Impact

- **Code:** `src/components/CnOpenBuildEditButton/` (new), `src/composables/useManifestEditor.js` (new) + a thin `useOpenBuildEditAvailability` wiring composable reading `useAppStatus`, `src/modals/CnEditMenuModal.vue` + `src/modals/CnEditSidebarModal.vue` (new), `src/components/CnWidgetGrid/CnWidgetGrid.vue` (edit-aware mode), `src/components/CnPageRenderer/CnPageRenderer.vue` + `src/components/CnAppRoot/CnAppRoot.vue` (mount button right of refresh; provide editor state), `src/img/openbuild.svg` (library copy of the glyph), barrel exports in `src/index.js`.
- **Consumers:** All five (OpenRegister, OpenCatalogi, Procest, Pipelinq, MyDash) — additively and default-off; the button only appears where OpenBuild is reachable, so no consumer requires changes.
- **Theming:** Adds one Conduction brand color reference `var(--c-orange-knvb)` (fallback `#F36C21`) used solely for the OpenBuild button; everything else reuses existing Nextcloud CSS variables. No `--nldesign-*` direct use.
- **Dependencies (hard):**
  - `manifest-delta-merge-and-flex-columns` (**shipped**) — provides `mergeManifestDelta`, `diffManifest`, `widgetEntry.id`, `mergeStrategy:'delta'`, `resolveSlotColumns`/`slotColumns`.
  - `cn-widget-library` (**sibling change**) — provides `CnAddWidgetModal`; the "Add widget…" menu item references it.
  - The OpenBuild **persistence change** (separate repo) — owns the actual delta storage endpoint; this change only emits `@save(delta)` / calls an injected persist function.
- **Cross-repo:** ADR-004 (modal isolation, NcSelect input labels) governs the two modals; ADR-036 (manifest model) governs the delta-on-save contract.
