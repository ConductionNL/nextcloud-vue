## Context

MyDash (App Store id `mydash`, repo `launchpad`) owns a complete dashboard widget catalog under `src/components/Widgets/` and `src/constants/widgetRegistry.js`:

- **`widgetRegistry.js`** — the single source of truth. Maps a `type` string to `{ renderer, form, defaultContent, displayName, icon, requires? }`. Helpers: `listWidgetTypes()` (form-bearing types only), `getWidgetTypeEntry()`, `getDefaultContent()`.
- **`AddWidgetModal.vue`** — `NcModal` host with a type `<select>` + `<component :is>` sub-form, an `isValid`/`firstError` gate that re-runs on a `validationTick`, edit-mode pre-fill, and an `onSubmit` that emits `{type, content}` and does NO API or GridStack work.
- **`useWidgetForm.js`** — a `Vue.observable` state container (`{type, content, editingWidget}`) with `resetForm` / `loadEditingWidget` / `validate(subFormRef)` / `assembleContent(subFormRef)`.
- **21 renderer/form pairs** under `Renderers/` and `Forms/`, plus sub-editors `MenuItemEditor.vue`, `TextTableEditor.vue`, `NcWidgetGridPicker.vue`.
- **Chrome**: `WidgetWrapper.vue`, `WidgetStyleEditor.vue`, `VisibilityRulesModal.vue`, `WidgetContextMenu.vue`.

The library already has a parallel, narrower v2 widget system: `src/components/CnWidgetGrid/builtInWidgets.js` exposes `BUILT_IN_WIDGETS` (keys `object-table`, `form-renderer`, `map-viewer`, `card-grid`, `data`, `metadata`, `related`, `integration`) and `CnWidgetGrid` resolves a manifest `widgetKey` against `BUILT_IN_WIDGETS` then a consumer-supplied `cnRegistry` inject. `CnWidgetWrapper` already provides widget chrome (header + Actions overflow menu: Refresh / Documentation / Request a feature). The sibling change `cn-openbuild-edit-shell` adds an in-library edit mode that needs the Add-widget flow.

Constraints: Vue 2.7 Options API only; `cn-` CSS prefix; Nextcloud CSS variables only (never `--nldesign-*`); barrel exports (`component/index.js → components/index.js → src/index.js`); `check:docs` requires a doc page per public export; `check:jsdoc` requires 100% coverage for new `Cn*`; modals isolated under `src/modals/`; i18n via the library's own `t()` (apps currently call `t('launchpad', …)` / `t('mydash', …)`).

## Goals / Non-Goals

**Goals:**
- One shared, extensible registry that composes with `BUILT_IN_WIDGETS` so manifest `widgetKey`s and the dashboard catalog resolve through one ordered lookup.
- All 21 widgets available to any app — renderer + form config schemas preserved byte-for-byte so existing persisted placements keep rendering.
- App coupling broken at the library boundary: no library file may `import` a sibling app (financeq/procest/launchpad). NC-app coupling stays but degrades gracefully.
- LaunchPad becomes a thin consumer; its observable behaviour is unchanged.
- Full library hygiene: barrels, docs, 100% jsdoc, modal isolation, NC CSS vars, lib `t()`.

**Non-Goals:**
- No change to any existing v2 widget key or to `CnWidgetGrid`/`CnDashboardGrid` rendering semantics.
- No server-side / PHP change (placements, visibility rules persistence stay app-owned APIs).
- Not building new widget types — this is a move + decouple, not a feature add.
- Not migrating LaunchPad's catalog browse view (`listCatalogEntries`) — that is LaunchPad-specific and stays in the app.

## Decisions

### D1 — Registry: a library module that COMPOSES with `BUILT_IN_WIDGETS`, not replaces it

New module `src/components/CnWidgetGrid/dashboardWidgetRegistry.js` exports a mutable registry object plus `registerDashboardWidget(type, entry)`, `getWidgetTypeEntry(type)`, `listWidgetTypes()`, `getDefaultContent(type)`. The 21 catalog widgets self-register at import time. `CnWidgetGrid` widget-key resolution becomes an ordered lookup: **(1) `BUILT_IN_WIDGETS`** (v2 manifest widgets) → **(2) `dashboardWidgetRegistry`** (catalog widgets) → **(3) consumer `cnRegistry` inject** (app overrides win last). This keeps the two systems independent at their cores while giving manifests access to catalog widgets by key.

*Alternative considered:* fold the catalog directly into `BUILT_IN_WIDGETS`. Rejected — `BUILT_IN_WIDGETS` keys are object-detail widgets needing a loaded OR object; catalog widgets are content/config-driven. Mixing them blurs two contracts and breaks the detail-context prop merge.

### D2 — Collision policy: last-registration-wins, with a dev warning

`registerDashboardWidget()` on an existing key overwrites and emits a `console.warn` naming the type and that an override occurred. Consumer `cnRegistry` overrides still win over both internal registries at resolution time (D1 step 3), so an app never has to mutate the shared registry to skin a single widget. This mirrors the existing `cnRegistry`-override-wins semantics already documented for `BUILT_IN_WIDGETS`.

### D3 — Naming: `Cn<Name>Widget` / `Cn<Name>WidgetForm`

Each renderer becomes `Cn<Name>Widget` (e.g. `CnLabelWidget`, `CnSpendAnalyticsWidget`), each form `Cn<Name>WidgetForm`. Registry `type` keys stay the original lower-case strings (`label`, `text`, `nc-widget`, `spend-analytics`, …) so persisted placements and manifest keys are unchanged. Sub-editors become `CnMenuItemEditor`, `CnTextTableEditor`, `CnNcWidgetGridPicker`.

### D4 — spend-analytics decoupling via injected data source (the load-bearing decision)

Today `SpendAnalyticsWidget.vue` imports `fetchFinanceSummary` / `fetchVendorCommitments` / `fetchSpendNarrative` from a local `services/spendAnalytics.js`. In the library it MUST NOT import any sibling app. The library component takes its data source from **either** a `dataSource` prop (an object exposing `fetchSummary` / `fetchVendorCommitments` / `fetchNarrative`) **or** a `provide`d injection key (`cnSpendAnalyticsSource`). When neither is supplied, the renderer shows its existing empty-state ("No spend data — financeq is not installed" / "No vendor data — procest is not installed") rather than throwing. The soft `requires.graphql` hint stays metadata-only and is NEVER promoted to `manifest.dependencies`. LaunchPad supplies the source via `provide` from its dashboard root, so its behaviour is preserved.

*Alternative considered:* an optional dynamic `import('financeq/...')`. Rejected — a library cannot resolve a sibling app's module path, and it reintroduces the coupling at build time.

### D5 — nc-widget bridge stays app-agnostic

`NcDashboardWidget` uses LaunchPad-local `services/widgetBridge.js` + `services/api.js` to talk to `OCA.Dashboard.register` (native fast-path) and `GET /api/widgets/items` (API fallback). In the library, `CnNcWidgetWidget` reads `OCA.Dashboard` directly (a Nextcloud-global, not an app) for the native path and calls the Nextcloud OCS dashboard endpoint via `@nextcloud/axios` + `@nextcloud/router` for the API path — no LaunchPad service import. When `OCA.Dashboard` is absent and the OCS endpoint 404s, it degrades to an empty state. The bridge thus depends only on Nextcloud globals, never on LaunchPad.

### D6 — NC-app-coupled widgets keep lazy `@nextcloud/*` imports + graceful empty states

`files`, `people`, `calendar` already lazy-`import('@nextcloud/axios')` / `import('@nextcloud/router')` inside their fetch paths. That pattern is library-safe (those are peer deps) and is preserved. Each documents the required NC app (Files / Contacts / Calendar) and renders an empty/disabled state when the backing app or endpoint is unavailable, never a hard error.

### D7 — Chrome: reuse `CnWidgetWrapper`, move the editors

LaunchPad's `WidgetWrapper.vue` is NOT moved as a new component — its header/title/actions role is already covered by the library's `CnWidgetWrapper` (Cards-vs-Widgets: widgets render on `CnWidgetWrapper`). The catalog renderers mount inside `CnWidgetWrapper` in consuming contexts. The `WidgetStyleEditor` and `VisibilityRulesModal` surfaces, which have no library equivalent, move as `CnWidgetStyleEditorModal` and `CnWidgetVisibilityRulesModal` under `src/modals/`. `WidgetContextMenu` collapses into `CnWidgetWrapper`'s existing Actions menu where possible; any residual catalog-specific items become slot content, not a duplicate menu component.

### D8 — Modal isolation + i18n

`CnAddWidgetModal`, `CnWidgetStyleEditorModal`, `CnWidgetVisibilityRulesModal` each live in their own file under `src/modals/` (modal-isolation rule). All user strings move from `t('launchpad', …)` / `t('mydash', …)` to the library's `t()` (per CLAUDE.md i18n). English source strings as keys.

### D9 — Phasing the implementation in waves (spec covers all 21 at once)

The spec is complete (all 21 widgets), but implementation lands in dependency-ordered waves so each wave is independently shippable and testable:
1. **Wave 0 — Foundation**: registry module + `useWidgetForm` + sub-editors + `CnAddWidgetModal` (no widgets yet; modal renders empty type list).
2. **Wave 1 — Portable/content (13)**: label, text, image, link, divider, header, quicklinks, video, news, container, tile, menu, links — pure, no coupling.
3. **Wave 2 — NC-integration-coupled (4)**: files, people, calendar, nc-widget — with graceful-degradation contracts.
4. **Wave 3 — Fleet-coupled (1)**: spend-analytics — with the injected data source.
5. **Wave 4 — Chrome + barrel + docs + rewire**: style-editor + visibility-rules modals, barrel exports, docs pages, jsdoc baselines, then LaunchPad re-import + local-copy deletion.

## Risks / Trade-offs

- **[Bundle size]** 42 components added to the library inflate the bundle for apps that import the barrel. → Keep every widget tree-shakeable (`sideEffects` honored; no top-level side effects beyond self-registration), lazy-load `@nextcloud/*` helpers inside fetch paths, and document that apps import widgets by name, not the whole catalog.
- **[Registry self-registration order]** Import-time self-registration means import order affects which override wins. → Make resolution deterministic via the D1 ordered lookup (consumer `cnRegistry` always wins last), and warn on internal collisions (D2) so accidental double-registration is visible.
- **[App-coupled widget leaks]** A careless move could leave a `import 'financeq/...'` or a `services/widgetBridge.js` import in a library file. → A CI/lint check (or the modal-isolation/hydra-gate sweep) MUST fail on any library import of a sibling-app path; spend-analytics and nc-widget have explicit decoupling requirements + scenarios.
- **[i18n domain switch]** Moving strings from `launchpad`/`mydash` domain to the library `t()` could drop translations. → English source strings are the keys; library l10n picks them up; MyDash loses no behaviour because the library renders the same English fallback.
- **[Config-shape drift]** Any change to a `defaultContent` shape would break persisted placements. → Spec pins each widget's config schema as "unchanged"; scenarios assert an existing placement renders identically.
- **[Container recursion + gridstack]** The container widget hosts a recursive sub-grid via gridstack (already a lib dep); depth cap (3) is server-enforced in LaunchPad. → Library container renders whatever depth it is handed; it does not re-implement the server cap.

## Migration Plan

1. Land Waves 0–4 in the library behind new barrel exports; no consumer is forced to adopt.
2. Publish a library beta; LaunchPad bumps the dep, re-imports `CnAddWidgetModal` + registry + widgets + modals from `@conduction/nextcloud-vue`, wires its spend-analytics `provide`, then deletes its local `Widgets/` + `widgetRegistry.js` + `useWidgetForm.js` copies.
3. Verify LaunchPad dashboards render and the Add-widget flow works unchanged (edit mode, validation gate, type switch).
4. Other apps adopt the catalog via the manifest renderer / `cn-openbuild-edit-shell` at their own pace.

**Rollback:** the move is additive in the library; if LaunchPad regresses, LaunchPad reverts its dep bump and re-imports locally while the library exports remain. No existing v2 widget key changes, so non-LaunchPad consumers are unaffected either way.

## Open Questions

- Should `CnWidgetContextMenu` survive as a thin component or fully fold into `CnWidgetWrapper`'s Actions slot? (Leaning fold — see D7.)
- Does `cn-openbuild-edit-shell` want `CnAddWidgetModal` to also surface the v2 `BUILT_IN_WIDGETS` keys in its type picker, or only catalog types? (Spec scopes the picker to form-bearing registry types; v2 keys have no `form`.)
- Final injection key name for the spend-analytics source (`cnSpendAnalyticsSource` proposed) — confirm against the `universal-shared-integration-registry` naming.
