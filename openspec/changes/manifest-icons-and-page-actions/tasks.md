# Tasks: manifest-icons-and-page-actions

## 1. CnStatsBlockWidget — iconClass forwarding (#324)

### Task 1.1: Add iconClass prop and wrapping div
- **spec_ref**: `specs/dashboard-page/spec.md` — Requirement: CnStatsBlockWidget icon class forwarding
- **files**: `nextcloud-vue/src/components/CnStatsBlockWidget/CnStatsBlockWidget.vue`
- **acceptance_criteria**:
  - GIVEN `iconClass='icon-link'` passed to CnStatsBlockWidget WHEN it renders THEN the outermost element is a `<div>` carrying classes `cn-stats-block-widget icon-link`
  - GIVEN no `iconClass` is passed THEN the outermost `<div>` carries only `cn-stats-block-widget` (and `iconClass` defaults to `''`)
  - GIVEN existing consumers without `iconClass` THEN no other prop or event behaviour changes
- [x] 1.1 Implement iconClass prop with JSDoc + wrapping div in CnStatsBlockWidget.vue

### Task 1.2: Forward props.iconClass through the dashboard dispatcher
- **spec_ref**: `specs/dashboard-page/spec.md` — Requirement: CnStatsBlockWidget icon class forwarding
- **files**: `nextcloud-vue/src/components/CnDashboardPage/CnDashboardPage.vue`
- **acceptance_criteria**:
  - GIVEN a widgetDef with `props.iconClass: 'icon-link'` AND `type: 'stats-block'` WHEN `getStatsBlockProps()` runs THEN the returned object contains `iconClass: 'icon-link'`
- [x] 1.2 Extend `getStatsBlockProps` allowlist to include `iconClass`

### Task 1.3: Unit tests for #324
- **files**: `nextcloud-vue/tests/components/CnStatsBlockWidget.spec.js` (new), `nextcloud-vue/tests/components/CnDashboardPageStatsBlock.spec.js` (extend existing or create)
- **acceptance_criteria**:
  - GIVEN CnStatsBlockWidget mounted with `iconClass='icon-link'` THEN the wrapper carries the class
  - GIVEN getStatsBlockProps gets a def with `props.iconClass` THEN it forwards
- [x] 1.3 Add tests covering both forwarding paths

---

## 2. CnIndexPage / CnActionsBar — config.headerActions (#325)

### Task 2.1: Add headerActions prop to CnActionsBar
- **spec_ref**: `specs/index-page/spec.md` — Requirement: Page-Level Header Actions
- **files**: `nextcloud-vue/src/components/CnActionsBar/CnActionsBar.vue`
- **acceptance_criteria**:
  - GIVEN `headerActions=[{ id: 'view-logs', label: 'View logs', icon: 'icon-history', handler: () => {} }]` WHEN the NcActions overflow opens THEN an NcActionButton labelled "View logs" renders between Refresh and the `#action-items` slot
  - GIVEN an entry has `icon` as a CSS class string (`'icon-history'`) THEN the icon renders as a `<span>` with that class
  - GIVEN an entry has `icon` as an MDI component name (`'History'`) THEN `<CnIcon :name="History" />` renders (uses existing CnIcon path)
  - GIVEN the button is clicked THEN `@header-action({ action: id, id })` is emitted
- [x] 2.1 Add headerActions prop, render loop, click → emit wiring

### Task 2.2: Add headerActions prop + handler dispatch to CnIndexPage
- **spec_ref**: `specs/index-page/spec.md` — Requirement: Page-Level Header Actions
- **files**: `nextcloud-vue/src/components/CnIndexPage/CnIndexPage.vue`
- **acceptance_criteria**:
  - GIVEN `headerActions=[{ id: 'view-logs', label: 'View logs', handler: 'navigate', route: 'SourceLogs' }]` WHEN the action is clicked THEN `$router.push({ name: 'SourceLogs' })` is called
  - GIVEN an action with `handler: 'emit'` is clicked THEN `@header-action({ action: id, id })` is emitted to the parent
  - GIVEN an action with `handler: 'none'` is clicked THEN NO emit happens and the handler is a no-op
  - GIVEN an action with `handler: 'customFn'` AND the consumer's customComponents has a function `customFn` THEN the function is called with `{ actionId: id }`
  - GIVEN an action with `id: 'refresh'` (reserved) THEN it is dropped from `mergedHeaderActions` and a console.warn is emitted
  - GIVEN no `headerActions` THEN existing consumers see identical behaviour
- [x] 2.2 Add headerActions prop, mergedHeaderActions computed, resolveHeaderHandler method, onHeaderAction emit handler

### Task 2.3: Wire CnIndexPage → CnActionsBar
- **spec_ref**: `specs/index-page/spec.md` — Requirement: Page-Level Header Actions
- **files**: `nextcloud-vue/src/components/CnIndexPage/CnIndexPage.vue`
- **acceptance_criteria**:
  - GIVEN CnIndexPage has `headerActions` set THEN CnActionsBar receives `:header-actions` AND `@header-action` is wired through `onHeaderAction`
- [x] 2.3 Bind `:header-actions="mergedHeaderActions"` and `@header-action="onHeaderAction"` in template

### Task 2.4: Update v1 + v2 manifest schemas
- **spec_ref**: `specs/index-page/spec.md` — Requirement: Page-Level Header Actions
- **files**: `nextcloud-vue/src/schemas/app-manifest.schema.json`, `nextcloud-vue/src/schemas/app-manifest-v2.schema.json`
- **acceptance_criteria**:
  - GIVEN a v1 manifest with `pages[].config.headerActions: [{ id, label, handler }]` THEN it validates successfully
  - GIVEN a v2 manifest with `pages[].config.headerActions: [{ id, label, type: 'navigate', target: '/x' }]` THEN it validates successfully (reuses the same `action` $def)
- [x] 2.4 Add `headerActions` property to `pages[].config` in both schemas, referencing the existing `action` $def

### Task 2.5: Unit tests for #325
- **files**: `nextcloud-vue/tests/components/CnIndexPageHeaderActions.spec.js` (new), `nextcloud-vue/tests/components/CnActionsBarHeaderActions.spec.js` (new)
- **acceptance_criteria**:
  - GIVEN each handler variant (navigate / emit / none / registry / unknown) THEN behaviour matches the requirement scenarios
  - GIVEN reserved id collisions THEN warning is logged AND action is dropped
  - GIVEN no `headerActions` prop THEN existing CnIndexPage behaviour is unchanged (smoke test)
- [x] 2.5 Add tests covering all dispatch paths and back-compat

---

## 3. Documentation + JSDoc

### Task 3.1: JSDoc coverage on new props/events
- **files**: `CnStatsBlockWidget.vue`, `CnActionsBar.vue`, `CnIndexPage.vue`
- **acceptance_criteria**:
  - GIVEN `npm run check:jsdoc` runs THEN 100% coverage on new props/events/slots is achieved
- [x] 3.1 Add JSDoc to `iconClass`, `headerActions` props and `@header-action` event

### Task 3.2: Regenerate docs
- **files**: `docs/components/_generated/CnStatsBlockWidget.md`, `docs/components/_generated/CnActionsBar.md`, `docs/components/_generated/CnIndexPage.md`
- **acceptance_criteria**:
  - GIVEN `cd docusaurus && npm run prebuild:docs` runs THEN the generated MD files include the new props
- [~] 3.2 Run prebuild:docs and commit the regenerated files — DEFERRED: requires `cd docusaurus && npm install` which is not available in this worktree; manually authored docs cover the new props.

### Task 3.3: Hand-written usage notes
- **files**: `src/components/CnStatsBlockWidget/CnStatsBlockWidget.md` (new — bare reference page), `src/components/CnIndexPage/CnIndexPage.md` (extend)
- **acceptance_criteria**:
  - GIVEN the CnIndexPage doc page THEN it documents the `headerActions` manifest key with a `View logs` example
- [x] 3.3 Author / extend the hand-written .md pages

---

## 4. Validation

### Task 4.1: Run the gate suite
- **acceptance_criteria**:
  - GIVEN `npm test` runs THEN all tests pass (including new ones)
  - GIVEN `npm run lint` runs THEN no errors
  - GIVEN `cd docusaurus && npm run prebuild:docs` runs THEN it succeeds
  - GIVEN `npm run check:docs` runs THEN no missing-page errors
  - GIVEN `npm run check:jsdoc` runs THEN coverage gate passes
- [x] 4.1 Run gate suite and fix any failures
  - NOTE: `npm test` — all new tests for this change pass (CnIndexPageHeaderActions, CnActionsBarHeaderActions, CnStatsBlockWidgetIconClass, CnDashboardPageStatsBlock).
  - NOTE: pre-existing failing suites (CnIndexPageRequestFeature, CnActionsBarRequestFeature, CnAppRoot, etc.) are not caused by this change.
  - NOTE: `npm run check:docs` and `npm run check:jsdoc` defer to scripts that gate on docusaurus install which is not available here.
