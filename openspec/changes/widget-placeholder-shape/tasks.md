# Tasks: widget-placeholder-shape

> The shape declaration, the placeholder component, the wrapper and the two hosts (ADR-032 `kind: code`).
> Checkbox budget: 7 tasks, 14 unindented `- [ ]` lines (cap 20).

## Implementation tasks

### Task 1: The shape declaration and its resolver
- **spec_ref**: `openspec/changes/widget-placeholder-shape/specs/widget-placeholder/spec.md#requirement-a-widget-declares-its-placeholder-shape`
- **files**: `src/schemas/app-manifest.schema.json`, `src/components/CnWidgetGrid/dashboardWidgetRegistry.js`, `src/utils/resolveWidgetPlaceholder.js`, `src/utils/__tests__/resolveWidgetPlaceholder.spec.js`, `src/components/CnWidgetGrid/__tests__/dashboardWidgetRegistry.spec.js`
- **acceptance_criteria**:
  - `widgetDef.placeholder`: a shape name from the closed enum `rows | lines | block | tiles | counter | heading`, or `{ shape, count }` with `count` an integer 1 to 24; schema version 1.9.0, changelog entry
  - `registerDashboardWidget` accepts `placeholder` for library and app-registered types alike, and throws a `TypeError` naming the type for an invalid value; the `DashboardWidgetEntry` typedef documents it
  - `resolveWidgetPlaceholder(widgetDef, registryEntry, ncDescriptor)` returns `{ shape, count }` in the order manifest, registry, NC descriptor, `rows` (design D2)
  - JSDoc on every exported function
- [x] Implement
- [x] Test (schema valid and invalid cases, registry refusal, resolution order including the `rows` default)

### Task 2: Every library widget type declares a shape
- **spec_ref**: `openspec/changes/widget-placeholder-shape/specs/widget-placeholder/spec.md#requirement-a-widget-declares-its-placeholder-shape`
- **files**: each `registerDashboardWidget(...)` call under `src/components/`, `src/components/CnWidgetGrid/__tests__/dashboardWidgetRegistry.placeholder.spec.js`
- **acceptance_criteria**:
  - Proposed shapes. The build lane that builds or touches a widget checks its shape against that widget's board and corrects it in the same PR:
    - `rows`: audit-trail, calendar, checklist, checklist-run, conversation, document-review, events, files, flow-runs, index-list, linked, links, macros, mail, menu, nc-widget, object-links, object-list, object-table, parties, people, presence, quicklinks, record-list, record-notes, related, retention, row-mark-list, saved-view, saved-views, share-list, tasks, team-workload, timeline, work-queue
    - `lines`: attention-flag, banner, facts, field-groups, field-list, handoff, markdown, next-step, notepad, plan, schema-rules, sections, status-explainer, text
    - `block`: ai-chat, chart, chips-field, choice-picker, code, conflict-resolve, container, create-form, data, device-frames, gauge, image, interaction-form, kb-search, map, object-geo, party-actions, radio-cards, settings-form, slot-grid, spend-analytics, stacked-bar, stages, switch-rows, table, tabs, task-form, toggle-table, video, week-strip, working-calendar, workspace-filter
    - `tiles`: action-tiles, app-tile, app-tiles, grouped-cards, tile
    - `counter`: countdown, delta, stat, stat-grid, stats-block
    - `heading`: divider, header, label
  - A test fails when any registered type has no valid `placeholder`
- [x] Declare the shapes
- [x] Test

### Task 3: CnWidgetPlaceholder and its standalone CSS
- **spec_ref**: `openspec/changes/widget-placeholder-shape/specs/widget-placeholder/spec.md#requirement-cnwidgetplaceholder-draws-one-shape`
- **files**: `src/components/CnWidgetPlaceholder/CnWidgetPlaceholder.vue`, `src/components/CnWidgetPlaceholder/CnWidgetPlaceholder.md`, `src/components/CnWidgetPlaceholder/index.js`, `src/components/index.js`, `css/widget-placeholder.css`, `src/components/CnWidgetPlaceholder/__tests__/CnWidgetPlaceholder.spec.js`
- **acceptance_criteria**:
  - Props `shape` (default `rows`) and `count`; markup contract of design D4 with `aria-hidden="true"`; `heading` renders nothing
  - Without a count it fills the container (rows 44 px, lines 24 px, whole tiles) through a `ResizeObserver`; with a count it clips to the container
  - Nextcloud colour variables only; shimmer 1.8 s, none under `prefers-reduced-motion: reduce`
  - `css/widget-placeholder.css` holds only the placeholder rules, under 2 KB minified; a snapshot test pins the markup per shape
  - Component reference docs updated
- [x] Implement
- [x] Test

### Task 4: The declarations for a server
- **spec_ref**: `openspec/changes/widget-placeholder-shape/specs/widget-placeholder/spec.md#requirement-the-declarations-and-the-look-are-available-to-a-server`
- **files**: `scripts/build-widget-placeholders.js` (CommonJS like the other build scripts; run after rollup by `npm run build`), `package.json` (`exports`, `files`), `tests/build/widgetPlaceholders.spec.js`
- **acceptance_criteria**:
  - The build writes `dist/widget-placeholders.json` from the registry after every widget type has registered
  - `@conduction/nextcloud-vue/widget-placeholders.json` and `@conduction/nextcloud-vue/css/widget-placeholder.css` resolve from a consumer
  - A test compares the JSON with the registry, so they cannot drift
- [x] Implement
- [x] Test

### Task 5: CnWidgetWrapper draws the placeholder while loading
- **spec_ref**: `openspec/changes/widget-placeholder-shape/specs/widget-wrapper/spec.md#requirement-the-wrapper-draws-the-shaped-placeholder-while-the-widget-loads`
- **files**: `src/components/CnWidgetWrapper/CnWidgetWrapper.vue`, `src/components/CnWidgetWrapper/CnWidgetWrapper.md`, `src/components/CnWidgetWrapper/__tests__/CnWidgetWrapperLoading.spec.js`
- **acceptance_criteria**:
  - Props `loading` (default `false`) and `placeholder` (default `rows`); while loading: placeholder over the content area, slot mounted under `visibility: hidden`, `aria-busy="true"` on the root, no status message
  - Turning `loading` off removes the placeholder and shows the content in the same frame with no size change
  - `refreshing` on a loaded wrapper keeps the content; a wrapper without `loading` renders exactly as before
- [x] Implement
- [x] Test

### Task 6: CnWidgetRenderer reports loaded
- **spec_ref**: `openspec/changes/widget-placeholder-shape/specs/widget-renderer/spec.md#requirement-the-renderer-reports-its-first-load`
- **files**: `src/components/CnWidgetRenderer/CnWidgetRenderer.vue`, `src/components/CnWidgetRenderer/__tests__/CnWidgetRendererLoaded.spec.js`, the library widget renderers that fetch on mount
- **acceptance_criteria**:
  - `loaded` emitted once when the first fetch settles (items, empty, error); no spinner for the first fetch
  - A refresh keeps the current items and does not emit `loaded` again
  - Every library renderer that fetches on mount emits `loaded` the same way (the event launchpad `first-paint-skeleton` task 6 consumes)
- [ ] Implement
- [ ] Test

### Task 7: CnDashboardPage waits in shape and announces once
- **spec_ref**: `openspec/changes/widget-placeholder-shape/specs/dashboard-page/spec.md#requirement-each-widget-waits-in-its-declared-shape`
- **files**: `src/components/CnDashboardPage/CnDashboardPage.vue`, `src/components/CnDashboardPage/__tests__/CnDashboardPagePlaceholder.spec.js`, `l10n/`
- **acceptance_criteria**:
  - Each wrapper gets the resolved placeholder and `loading` until `loaded` (or first render, or error)
  - The pending conditional cell draws the widget's shape instead of "Loading…" and has no `role="status"`
  - One visually hidden `role="status"`: "Widgets are loading", then "All widgets loaded" once, then empty; at most one change per 2 seconds; strings in every shipped locale (nl "Widgets worden geladen", "Alle widgets geladen")
  - Docs: the developer note on declaring a widget's placeholder; for an app's own type, declare it once on the registration
- [ ] Implement
- [ ] Test (shapes per type, pending cell, one announcement, error ends the wait)
