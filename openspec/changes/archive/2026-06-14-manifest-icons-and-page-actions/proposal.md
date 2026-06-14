# Manifest icons on stats-block widgets + page-level header actions

## Why

Two consumer pressures from the openconnector v2-manifest migration converged on the same week and both blocked declarative manifests from carrying behaviour that already exists in code:

1. **`CnStatsBlockWidget` swallows the manifest icon (issue #324).** The widget docblock advertises `iconClass: 'icon-file'` as a supported manifest key (see `CnStatsBlockWidget.vue:42-44` example), but the wrapper has no `iconClass` prop and the dashboard dispatcher (`CnDashboardPage.getStatsBlockProps`) does not forward it. The result: KPI tiles ship icon-less from JSON manifests. openconnector#831 currently has icon-less tiles solely for this reason. The underlying `CnStatsBlock` primitive only supports `icon: Component` (a Vue MDI component) so a plain CSS-class path was never wired.

2. **`CnIndexPage` cannot declare a page-level action in JSON (issue #325).** `pages[].config.actions[]` is row-level — each entry lands in `CnRowActions`. There is no manifest key for the **top-level Actions overflow dropdown** rendered by `CnActionsBar`, which today only lists hard-coded built-ins (Refresh / Import / Export / Copy selected / Delete selected). Apps that want a page-level "View logs", "Open API docs", or per-route helper have to either:
   - drop to a JSX `#action-items` slot in a custom wrapper (loses manifest declarativeness), or
   - declare the action row-level and pretend it belongs per-row (semantic mismatch — openconnector#828 took this shortcut for "View logs").

Both gaps are pure manifest-renderer plumbing — the underlying primitives (CnStatsBlock icon slot, CnActionsBar NcActions overflow dropdown) already handle the surface, we just need to forward the data.

## What Changes

### #324 — `CnStatsBlockWidget` accepts `iconClass`

- **Add a new prop** `iconClass: String` (default `''`) to `CnStatsBlockWidget`.
- **Render a wrapping `<div>`** that carries the CSS class — `<div :class="['cn-stats-block-widget', iconClass]">` so consumers can use NC core icon classes (`icon-link`, `icon-mail`, …) already loaded by Nextcloud.
- **Forward `props.iconClass`** through the `CnDashboardPage.getStatsBlockProps` allowlist so manifest `widgetDef.props.iconClass` reaches the widget.
- **No MDI dynamic-import path.** Option 2 from the issue (heavyweight) is explicitly deferred — CSS class only.
- **Back-compat:** the wrapping `<div>` is empty when `iconClass` is unset, so existing consumers see identical DOM apart from the wrapper. CSS does not change CnStatsBlock layout because the wrapper has no padding/margins of its own.

### #325 — `CnIndexPage` accepts `config.headerActions[]`

- **Add a new prop** `headerActions: Array` (default `[]`) to `CnIndexPage`, mirrored by a `headerActions[]` config key on `pages[].config` (v1 + v2 manifest schemas).
- **Same shape as the existing row-level `actions[]`** (`{ id, label, icon, handler, route, ... }`) so manifest authors / consumers reuse the same mental model.
- **Forward** the resolved actions to `CnActionsBar` via a new `headerActions` prop on that component, rendered inside the existing `NcActions` overflow dropdown **after** the built-in Refresh action and **before** the `#action-items` slot — keeping built-ins primary and consumer-declared actions secondary.
- **Same `handler:` registry pattern** as row-level actions:
  - `navigate` — push `action.route` (no `params.id` because the header action is page-level, not row-bound)
  - `emit` — page emits `@header-action({ action: action.id, id: action.id })` for consumer to handle (mirrors row `@action` event)
  - `none` — sentinel no-op (suppresses emit)
  - any other string — registry lookup in `customComponents` (same as row); resolved to `(payload) => fn({ actionId })` and called with `{}`-only payload (no row).
- **Built-in masquerade prevention:** `id` values reserved for built-ins (`refresh`, `import`, `export`, `copy`, `delete`) are silently ignored with a console.warn so consumers cannot accidentally clash with the built-in Refresh / Import / Export / Copy selected / Delete selected items.
- **Schema:** `config.headerActions[]` is added as an enumerated key on `pages[].config` in both v1 (`app-manifest.schema.json`) and v2 (`app-manifest-v2.schema.json`) using the same `action` $def as the row-level `actions[]`.

## Impact

- **Affected specs:**
  - `dashboard-page` — adds CnStatsBlockWidget `iconClass` prop forwarding requirement
  - `index-page` — adds `config.headerActions[]` rendering + handler-dispatch requirement
- **Affected code:**
  - `src/components/CnStatsBlockWidget/CnStatsBlockWidget.vue` — new `iconClass` prop + wrapper div
  - `src/components/CnDashboardPage/CnDashboardPage.vue` — extend `getStatsBlockProps` allowlist
  - `src/components/CnIndexPage/CnIndexPage.vue` — new `headerActions` prop, `mergedHeaderActions` computed (with handler dispatch), `onHeaderAction` handler, template wiring to CnActionsBar
  - `src/components/CnActionsBar/CnActionsBar.vue` — new `headerActions: Array` prop, NcActionButton render loop in overflow, `@header-action` emit
  - `src/schemas/app-manifest.schema.json` + `src/schemas/app-manifest-v2.schema.json` — `headerActions` key on `pages[].config`
- **Affected docs:**
  - `docs/components/_generated/CnStatsBlockWidget.md` — autoregen via prebuild:docs
  - `docs/components/_generated/CnIndexPage.md` — autoregen
  - `docs/components/_generated/CnActionsBar.md` — autoregen
- **Breaking changes:** none. New props are optional with safe defaults; new manifest keys are additive; DOM diff for the stats-block widget is a single empty wrapping div.
- **Consumers unblocked:**
  - openconnector#831 (KPI tiles regain icons)
  - openconnector#828 ("View logs" moves to header)
