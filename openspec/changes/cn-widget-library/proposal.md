## Why

LaunchPad/MyDash owns a rich, self-contained dashboard widget catalog — 21 widget types, an Add-widget modal, a `widgetRegistry.js` single-source-of-truth, a `useWidgetForm` composable, and the widget chrome (wrapper, style editor, visibility rules). None of it is reusable: every other Conduction app that wants drag-and-drop, configurable dashboard widgets (via the v2 manifest renderer or the sibling `cn-openbuild-edit-shell` edit mode) would have to copy it. Moving the catalog into `@conduction/nextcloud-vue` makes the same widgets available fleet-wide, composes cleanly with the library's existing `BUILT_IN_WIDGETS` v2 registry, and lets MyDash become a thin consumer instead of the owner.

## What Changes

- **NEW** `CnAddWidgetModal` under `src/modals/` — the type-picker + dynamic per-type sub-form host, driven by a shared widget registry, emitting `submit({type, content})` with the existing `validate()` / disabled-submit / edit-mode lifecycle preserved. No API or GridStack calls.
- **NEW** shared dashboard widget registry exported from the library: `dashboardWidgetRegistry`, `registerDashboardWidget()`, `getWidgetTypeEntry()`, `listWidgetTypes()`, `getDefaultContent()`. Composable with the existing `BUILT_IN_WIDGETS` so manifest `widgetKey`s resolve to these widgets; consumer apps can extend/override with a defined collision policy.
- **NEW** 21 widgets moved into the library as `Cn<Name>Widget` (renderer) + `Cn<Name>WidgetForm` (form) pairs, config schemas unchanged, grouped by coupling:
  - *Portable/content* (no app coupling): label, text, image, link, divider, header, quicklinks, video, news/RSS, container, tile, menu, links.
  - *NC-integration-coupled*: files (Files), people (Contacts), calendar (NC Calendar), nc-widget (NC Dashboard API bridge) — moved, graceful degradation when the backing NC app is absent.
  - *Fleet-coupled*: spend-analytics (financeq/procest GraphQL) — moved, but its data source becomes injection/prop-driven, NOT a hard import of sibling apps.
- **NEW** `useWidgetForm` composable + the `MenuItemEditor`, `TextTableEditor`, and `NcWidgetGridPicker` sub-editors moved to the library.
- **MODIFIED** widget chrome: the existing `CnWidgetWrapper` is reused (not duplicated) for header/actions; the style editor and visibility-rules surfaces move to the library as `CnWidgetStyleEditorModal` and `CnWidgetVisibilityRulesModal` under `src/modals/`.
- **MODIFIED** library barrel + docs + jsdoc baselines + registry composition in `grid-widget-system` to cover the new component surface.
- **Backwards-compat**: LaunchPad/MyDash re-imports all of the above from `@conduction/nextcloud-vue` instead of its local copies. No breaking change to any existing v2 widget key (`object-table`, `form-renderer`, `map-viewer`, `card-grid`, `data`, `metadata`, `related`, `integration`).

## Capabilities

### New Capabilities

- `cn-widget-library`: the shared dashboard widget catalog — the registry API (`dashboardWidgetRegistry` + register/get/list helpers), the `CnAddWidgetModal` type-picker/sub-form host, the 21 `Cn<Name>Widget` / `Cn<Name>WidgetForm` pairs grouped by coupling, the `useWidgetForm` composable + sub-editors, the style-editor and visibility-rules modals, and the coupling-decoupling contracts (spend-analytics data injection, nc-widget app-agnostic bridge, NC-app graceful degradation).

### Modified Capabilities

- `grid-widget-system`: registry composition — the library widget barrel now also exports the catalog `Cn<Name>Widget` set, and the `widgetKey` resolution order (`BUILT_IN_WIDGETS` → shared dashboard registry → consumer `cnRegistry` override) is specified so the dashboard widget catalog and the v2 manifest widgets resolve through one ordered lookup.

## Impact

- **Library (`@conduction/nextcloud-vue`)**: ~42 new component files (21 renderers + 21 forms) plus 3 modals, 1 composable, 2 sub-editors, the registry module, barrel entries in `src/components/index.js` + `src/index.js`, per-component docs (`check:docs`), jsdoc baselines at 100% for new exports. Bundle size grows; widgets must stay tree-shakeable (`sideEffects` discipline) and lazy where they pull `@nextcloud/*` helpers.
- **Dependencies**: `gridstack` is already a library dep (used by CnDashboardGrid); the container widget's recursive sub-grid relies on it. No new sibling-app dependency is introduced — spend-analytics reads its data through an injected/prop data source.
- **Consumers**: MyDash/LaunchPad becomes a consumer (re-import, delete local copies); OpenRegister, OpenCatalogi, Procest, Pipelinq gain the catalog via the manifest renderer + `cn-openbuild-edit-shell`. All NC CSS-variable / `cn-` prefix / lib `t()` conventions apply.
