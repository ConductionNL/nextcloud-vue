# Tasks — `manifest-index-page-followups`

## 1. Schema
- [x] 1.1 `src/schemas/app-manifest.schema.json` — added `quickFilters: Array<{label, filter, default?, icon?}>` to the `type:"index"` `config` (`additionalProperties:false` on each tab).
- [x] 1.2 Added `readOnly: { type:"boolean", default:false }` to the index `config` properties.
- [x] 1.3 `$defs.page` — added optional `permission: { type:"string" }`. No version bump (additive on existing $def).
- [x] 1.4 `handler:"emit"` was already documented in the existing `actions[].handler` $def's description+pattern (schema 1.3.0) — no schema change needed.

## 2. Built-in `"link"` cell widget
- [x] 2.1 `CnCellRenderer` template — added a `widget === 'link'` branch (router-link / external anchor / plain-text fallback + once-per-session `console.warn`).
- [x] 2.2 `linkRoute` / `linkHref` computeds + `rowKey` prop on `CnCellRenderer`.
- [x] 2.3 `CnDataTable` passes its `rowKey` down to `CnCellRenderer` (`:row-key="rowKey"`).
- [x] 2.4 New `src/components/CnQuickFilterBar/` — chose to inline `link` in `CnCellRenderer` (matches `badge` precedent — no separate `CnLinkCell` component).
- [x] 2.5 Doc updates: `docs/components/cn-cell-renderer.md` + `src/components/CnCellRenderer/CnCellRenderer.md` cover the built-in `"link"` widget AND the new `rowKey` prop.
- [x] 2.6 `tests/components/CnCellRenderer.spec.js` — 5 new tests: router-link from `widgetProps.route` (default `id` param from `rowKey`), explicit `widgetProps.params` map, external `<a target="_blank">` with `{key}` substitution, plain-text fallback + warn, formatter-shaped value used as link text.

## 3. Built-in `"date"` / `"datetime"` / `"relative-time"` formatters
- [x] 3.1 New `src/utils/builtInFormatters.js` — `BUILT_IN_FORMATTERS = { date, datetime, 'relative-time' }`, all safe against null/empty/non-parseable (return `''` / original value).
- [x] 3.2 `CnAppRoot` provides `cnFormatters: { ...BUILT_IN_FORMATTERS, ...this.formatters }` so consumer overrides win.
- [x] 3.3 `tests/utils/builtInFormatters.spec.js` — 12 tests covering ISO/Date/number/null/empty/garbage inputs + consumer-override scenario.

## 4. `config.readOnly:true` shorthand
- [x] 4.1 `CnPageRenderer.resolvedProps` — when `currentPage.type === 'index' && config.readOnly === true`, merges a frozen `READ_ONLY_DEFAULTS` map UNDER explicit `config.*` props; strips the `readOnly` key (no CnIndexPage prop for it).
- [x] 4.2 `tests/components/CnPageRenderer.spec.js` — 3 new tests: expands to the 9 falses; explicit `showAdd:true` overrides; `readOnly` omitted leaves props unchanged. (Used a stub for the `index` page type to keep CnIndexPage's pinia-needing setup out of the test.)

## 5. `pages[].permission`
- [x] 5.1 Schema only (covered in 1.3) — `validateManifest()` now accepts a manifest with `pages[].permission`. Runtime enforcement intentionally out of scope.

## 6. `handler:"emit"`
- [x] 6.1 Verified existing implementation: `CnIndexPage.mergedActions` strips the `handler` key for `"emit"` (and other non-resolvable handlers) → `CnRowActions` doesn't see a function → page emits `@action` only. `"none"` is suppressed via `_dispatchSuppress`. No code change required; spec scenario updated to match the existing `{action: <label>, row: <item>}` payload shape.

## 7. Quick-filter tabs (`pages[].config.quickFilters`)
- [x] 7.1 New `src/components/CnQuickFilterBar/CnQuickFilterBar.vue` + index.js + styleguide + `docs/components/cn-quick-filter-bar.md`. Pill-shaped buttons; active uses `--color-primary-element`; emits `update:active-index`.
- [x] 7.2 `CnIndexPage` — `quickFilters` prop (Array, default null); imports `CnQuickFilterBar`; template renders it above the body when `quickFilters.length > 0`; `onQuickFilterChange(i)` updates the setup-returned `activeQuickFilterIndex` ref + emits `@quick-filter-change`.
- [x] 7.3 `setup()` — `activeQuickFilterIndex = ref(initialIdx)` (first `default:true`, else 0, else null); factored `resolveFilterMap(filterMap, params)` helper; `fixedFilters` getter composes `{ ...resolveFilterMap(props.filter), ...resolveFilterMap(props.quickFilters[active]?.filter) }` (quick wins over `props.filter`); `watch(activeQuickFilterIndex, () => list.refresh(1))`.
- [x] 7.4 `tests/components/CnIndexPageQuickFilters.spec.js` — 7 tests: initial fetch carries the default tab's filter, no `default` → index 0 active, switching tabs re-fetches, quick wins over `config.filter`, emits `@quick-filter-change`, no `quickFilters` → no bar + identical behaviour, tab `filter` resolves `@route.<name>`.
- [x] 7.5 Exported `CnQuickFilterBar` from `src/index.js` + `src/components/index.js`.

## 8. Docs
- [x] 8.1 `docs/migrating-to-manifest.md` — new sections: "Quick-filter tabs", "Read-only shorthand", "Built-in cell formatters / widgets" (date/datetime/relative-time + link), "`pages[].permission` (schema-only)". `handler:"emit"` was already covered by the schema description.
- [x] 8.2 `docs/components/cn-index-page.md` + `src/components/CnIndexPage/CnIndexPage.md` — added `quickFilters` to the props tables; added `@quick-filter-change` to the events table.
- [x] 8.3 `docs/components/cn-cell-renderer.md` + `src/components/CnCellRenderer/CnCellRenderer.md` — `widget:"link"` as a built-in (route / href + `{key}` substitution / fallback + warn); built-in `date` / `datetime` / `relative-time` formatters; new `rowKey` prop.
- [x] 8.4 New `docs/components/cn-quick-filter-bar.md` (the `check:docs` gate).

## 9. Build & quality
- [x] 9.1 `npm test` — **91 suites / 1294 tests** all green (no regression; +27 from this change).
- [x] 9.2 `npm run lint` — **0 errors** (was 2 before the lint fix; 306 warnings are all pre-existing).
- [x] 9.3 `npm run build` — `dist/nextcloud-vue.esm.js` + `dist/nextcloud-vue.cjs.js` created (only pre-existing externals warnings).
- [x] 9.4 `npm run check:docs` — **89/89** component docs cover their props and slots; 153 → 154 exports all documented.
- [x] 9.5 `openspec validate manifest-index-page-followups` — valid.

## 10. Wrap-up
- [x] 10.1 Update this tasks.md (this commit).
- [ ] 10.2 PR → `beta`; admin-merge.
