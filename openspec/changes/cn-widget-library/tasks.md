# Tasks

Dependency-ordered, grouped by implementation wave (design D9). The spec covers all 21 widgets at once; these waves let each land independently and testably.

## Wave 0 — Foundation (registry + modal + composable + sub-editors)

- [ ] Create `src/components/CnWidgetGrid/dashboardWidgetRegistry.js` with `dashboardWidgetRegistry`, `registerDashboardWidget(type, entry)`, `getWidgetTypeEntry(type)`, `listWidgetTypes()`, `getDefaultContent(type)` (last-registration-wins + dev `console.warn` on override)
- [ ] Move `useWidgetForm` composable to `src/composables/useWidgetForm.js` (rebind `getDefaultContent` import to the new registry module)
- [ ] Move sub-editor `CnMenuItemEditor` to `src/components/CnMenuItemEditor/` (renderer/form-agnostic, contract preserved)
- [ ] Move sub-editor `CnTextTableEditor` to `src/components/CnTextTableEditor/`
- [ ] Move sub-editor `CnNcWidgetGridPicker` to `src/components/CnNcWidgetGridPicker/`
- [ ] Create `src/modals/CnAddWidgetModal.vue` — type `<select>` (filtered to `listWidgetTypes()`), `<component :is>` sub-form, `validate()`/`isValid`/`firstError` gate on `validationTick`, preselected-type + edit-mode lifecycle, `submit({type, content})`, Esc/cancel non-destructive, NO API/grid calls
- [ ] Switch all user strings in Wave-0 surfaces from `t('launchpad'|'mydash', …)` to library `t()` with English source keys
- [ ] Unit tests: registry helpers (list/get/default/register/override-warn), `useWidgetForm` (reset/load/validate/assemble), `CnAddWidgetModal` (picker, validation gate, edit/preselect, type-switch reset, close non-destructive)

## Wave 1 — Portable / content widgets (13, no app coupling)

- [ ] `label` → `CnLabelWidget` + `CnLabelWidgetForm` (config `{text, fontSize, color, backgroundColor, fontWeight, textAlign}`)
- [ ] `text` → `CnTextWidget` + `CnTextWidgetForm` (markdown/html + table mode via `CnTextTableEditor`; legacy HTML branch preserved)
- [ ] `image` → `CnImageWidget` + `CnImageWidgetForm` (`{url, alt, link, fit}`)
- [ ] `link` → `CnLinkButtonWidget` + `CnLinkButtonWidgetForm` (button + list mode; `{label, url, icon, actionType, backgroundColor, textColor, displayMode, listOrientation, listItemGap, links}`)
- [ ] `divider` → `CnDividerWidget` + `CnDividerWidgetForm` (`{style, lineColor, lineThickness, lineStyle, whitespaceSize, headingText}`)
- [ ] `header` → `CnHeaderWidget` + `CnHeaderWidgetForm` (banner; overlay/background/cta config preserved)
- [ ] `quicklinks` → `CnQuicklinksWidget` + `CnQuicklinksWidgetForm`
- [ ] `video` → `CnVideoWidget` + `CnVideoWidgetForm`
- [ ] `news` → `CnNewsWidget` + `CnNewsWidgetForm` (RSS; `{feedUrls, layout, itemLimit, showThumbnails, showSummary, summaryMaxChars, dateFormat, metadataFilter}`)
- [ ] `container` → `CnContainerWidget` + `CnContainerWidgetForm` (recursive sub-grid over `content.placements[]`; renders any handed depth, no server cap re-implementation)
- [ ] `tile` → `CnTileWidget` + `CnTileWidgetForm` (reads new inline `content.{...}` AND legacy flat `tile*` columns)
- [ ] `menu` → `CnMenuWidget` + `CnMenuWidgetForm` (uses `CnMenuItemEditor`)
- [ ] `links` → `CnLinksWidget` + `CnLinksWidgetForm` (sections; `{sections, columns, linkLayout, iconSize, openInNewTab, showSectionTitles, showLinkDescriptions}`)
- [ ] Self-register all 13 in `dashboardWidgetRegistry` with original `type` keys + unchanged `defaultContent`
- [ ] Unit tests per widget: renderer reads config, form edits the same shape, registry entry correct

## Wave 2 — NC-integration-coupled widgets (4, graceful degradation)

- [ ] `files` → `CnFilesWidget` + `CnFilesWidgetForm` (lazy `@nextcloud/axios`/`@nextcloud/router`; document Files dependency; empty/disabled state when unavailable)
- [ ] `people` → `CnPeopleWidget` + `CnPeopleWidgetForm` (document Contacts/provisioning source; degrade to empty state)
- [ ] `calendar` → `CnCalendarWidget` + `CnCalendarWidgetForm` (document NC Calendar dependency; empty agenda when no backend/events)
- [ ] `nc-widget` → `CnNcWidgetWidget` + `CnNcWidgetWidgetForm` — rewire bridge to read `OCA.Dashboard` global (native) + NC dashboard OCS endpoint (api) directly; remove any MyDash `widgetBridge`/`api` service import; uses `CnNcWidgetGridPicker`
- [ ] Self-register all 4; assert no library import of a MyDash service path
- [ ] Unit tests: graceful empty-state when backing app/endpoint absent; nc-widget native fast-path + api fallback

## Wave 3 — Fleet-coupled widget (spend-analytics, decoupled)

- [ ] `spend-analytics` → `CnSpendAnalyticsWidget` + `CnSpendAnalyticsWidgetForm` — remove the local `services/spendAnalytics.js` import; take data via `dataSource` prop OR `cnSpendAnalyticsSource` injection (`fetchSummary`/`fetchVendorCommitments`/`fetchNarrative`)
- [ ] Keep `requires.graphql` as soft metadata only; assert it is never written into `manifest.dependencies`
- [ ] Empty-state fallbacks preserved ("financeq not installed" / "procest not installed") when no source / no data
- [ ] Self-register; lint/test asserting no `import` of financeq/procest/launchpad module paths in the component
- [ ] Unit tests: renders from injected source; degrades without source

## Wave 4 — Chrome, barrel, docs, rewire

- [ ] Move style editor → `src/modals/CnWidgetStyleEditorModal.vue` (isolated)
- [ ] Move visibility rules → `src/modals/CnWidgetVisibilityRulesModal.vue` (include OR / exclude AND; group, time-of-day, date-range, user-attribute)
- [ ] Reconcile chrome: catalog widgets render inside the existing `CnWidgetWrapper`; fold `WidgetContextMenu` items into the wrapper Actions slot — add NO duplicate wrapper component
- [ ] Barrel: add every new component to `src/components/index.js` and `src/index.js`; export registry helpers + `useWidgetForm` from `src/index.js`
- [ ] Wire `CnWidgetGrid` resolution order: `BUILT_IN_WIDGETS` → `dashboardWidgetRegistry` → consumer `cnRegistry`
- [ ] Docs: write `docs/components/<kebab>.md` for every new `Cn*` widget/modal/sub-editor; `docs/utilities/composables/use-widget-form.md`; document the registry helpers; run `npm run check:docs` until green
- [ ] JSDoc: add 100% prop/event/slot JSDoc to every new `Cn*`; `npm run prebuild:docs`; `npm run check:jsdoc`; `npm run jsdoc-baselines:update` for the new components
- [ ] Verify NC CSS variables only (no `--nldesign-*`), `cn-` class prefix, library `t()` across all moved files
- [ ] LaunchPad/MyDash rewire: bump the lib dep, re-import registry + `CnAddWidgetModal` + widgets + modals + composable from `@conduction/nextcloud-vue`, `provide` the spend-analytics data source, delete local `Widgets/` + `widgetRegistry.js` + `useWidgetForm.js` copies; verify add-widget flow + existing placements render unchanged
- [ ] `openspec validate "cn-widget-library"` passes 4/4; `npm test` green
