# useDashboardView Specification

## Purpose

`useDashboardView(options)` is a composable exported by `@conduction/nextcloud-vue` that manages dashboard state: widget definitions, layout, NC Dashboard API widget loading, and layout persistence. It is the dashboard equivalent of `useListView` — the composable that handles all the state management a `CnDashboardPage` needs.

---

## ADDED Requirements

### Requirement: widget management

useDashboardView SHALL manage a reactive list of widget definitions and expose them via `widgets`.

#### Scenario: static widgets provided

- GIVEN `options.widgets` contains `[{ id: 'kpis', title: 'KPIs' }, { id: 'chart', title: 'Chart' }]`
- WHEN the composable is initialized
- THEN `widgets.value` contains both widget definitions

#### Scenario: setWidgets updates widget list

- GIVEN the composable is initialized
- WHEN `setWidgets([{ id: 'new', title: 'New Widget' }])` is called
- THEN `widgets.value` contains only the new widget definition

---

### Requirement: layout management

useDashboardView SHALL manage the current layout and provide `onLayoutChange` to handle updates.

#### Scenario: default layout used when no persisted layout

- GIVEN `options.defaultLayout` contains a 3-item layout and `loadLayout` returns `null`
- WHEN `init()` is called
- THEN `layout.value` equals the default layout

#### Scenario: persisted layout loaded

- GIVEN `loadLayout` returns a 2-item layout
- WHEN `init()` is called
- THEN `layout.value` equals the persisted layout (not the default)

#### Scenario: onLayoutChange updates layout and persists

- GIVEN `saveLayout` is provided
- WHEN `onLayoutChange(newLayout)` is called
- THEN `layout.value` is updated AND `saveLayout(newLayout)` is called

---

### Requirement: NC Dashboard API widget loading

When `includeNcWidgets` is `true`, useDashboardView SHALL fetch NC Dashboard API widgets from OCS and merge them into the widget list.

#### Scenario: NC widgets merged with static widgets

- GIVEN `options.widgets` has 2 static widgets and `includeNcWidgets` is `true`
- WHEN the OCS API returns 3 NC dashboard widgets
- THEN `widgets.value` contains 5 widgets total (2 static + 3 NC API)

#### Scenario: NC widget loading skipped when disabled

- GIVEN `includeNcWidgets` is `false`
- WHEN `init()` is called
- THEN no OCS API request is made and `widgets.value` contains only static widgets

---

### Requirement: add and remove widgets

useDashboardView SHALL provide `addWidget` and `removeWidget` functions to modify the layout.

#### Scenario: addWidget places widget in layout

- GIVEN `layout.value` has 2 items
- WHEN `addWidget('chart')` is called
- THEN `layout.value` has 3 items with the new widget placed at an available grid position

#### Scenario: removeWidget removes widget from layout

- GIVEN `layout.value` has 3 items including one with `widgetId: 'chart'`
- WHEN `removeWidget('chart')` is called
- THEN `layout.value` has 2 items and the chart widget is no longer present

---

### Requirement: computed helpers

useDashboardView SHALL expose `activeWidgetIds` and `availableWidgets` computed refs.

#### Scenario: activeWidgetIds reflects layout

- GIVEN `layout.value` contains items with `widgetId: 'kpis'` and `widgetId: 'chart'`
- WHEN `activeWidgetIds.value` is accessed
- THEN it is a Set containing `'kpis'` and `'chart'`

#### Scenario: availableWidgets excludes active ones

- GIVEN `widgets.value` has 3 widgets and `activeWidgetIds` contains 2 of them
- WHEN `availableWidgets.value` is accessed
- THEN it contains only the 1 widget not in the layout

---

### Requirement: loading and saving states

useDashboardView SHALL expose `loading` and `saving` refs that reflect async operation state.

#### Scenario: loading is true during init

- GIVEN `loadLayout` is an async function that takes 500ms
- WHEN `init()` is called
- THEN `loading.value` is `true` during the load and `false` after

#### Scenario: saving is true during save

- GIVEN `saveLayout` is an async function
- WHEN `onLayoutChange(layout)` triggers a save
- THEN `saving.value` is `true` during the save and `false` after

---

### Current Implementation Status

**Already implemented — all requirements are fulfilled:**

- **File**: `src/composables/useDashboardView.js`
- **Widget management**: `appWidgets` ref initialized from `options.widgets`. `setWidgets(newWidgets)` replaces app widgets. `widgets` computed merges `appWidgets` and `ncWidgets`.
- **Layout management**: `layout` ref. `init()` loads via `opts.loadLayout()` or falls back to `opts.defaultLayout`. `onLayoutChange(newLayout)` updates layout and calls `opts.saveLayout()` if provided.
- **NC Dashboard API widget loading**: `loadNcWidgets()` fetches from OCS endpoint `/apps/dashboard/api/v1/widgets` via axios. Transforms to normalized format with `type: 'nc-widget'`. Only called when `opts.includeNcWidgets` is true.
- **Add/remove widgets**: `addWidget(widgetId, position)` calculates next available position (max Y + height), assigns incrementing ID. `removeWidget(itemId)` filters by layout item ID (note: spec says "widgetId" but implementation filters by `item.id`).
- **Computed helpers**: `activeWidgetIds` returns array of widgetIds from layout (spec says Set, implementation returns Array). `availableWidgets` filters widgets not in activeWidgetIds.
- **Loading/saving states**: `loading` ref true during `init()`, `saving` ref true during `onLayoutChange` save.
- **Lifecycle**: `onMounted(() => init())` auto-initializes.

**Additional features not in spec:**
- `isEditing` ref for edit mode state
- `ncWidgets` ref exposed separately
- `init()` method exposed for manual re-initialization
- `addWidget` accepts optional `position` override object

**Not yet implemented:**
- All spec requirements are implemented.

### Standards & References

- Vue 3 Composition API (`ref`, `computed`, `onMounted`)
- Nextcloud OCS API: `/apps/dashboard/api/v1/widgets` for widget discovery
- `@nextcloud/axios` and `@nextcloud/router` for OCS URL generation

### Specificity Assessment

- **Specific enough to implement?** Yes — fully implemented.
- **Missing/ambiguous:**
  - Spec says `activeWidgetIds` is a `Set` but implementation returns an `Array` — behavioral difference for `.has()` vs `.includes()`.
  - Spec says `removeWidget('chart')` takes a widgetId string, but implementation's `removeWidget(itemId)` filters by layout item `id` (number), not `widgetId`.
  - Spec does not mention `isEditing` state or `init()` being exposed.
  - Spec does not mention error handling in `loadNcWidgets()` or `init()` (implementation catches and logs errors).
- **Open questions:**
  - Should `removeWidget` accept widgetId (as spec says) or layout item id (as implemented)?
  - Should `activeWidgetIds` return a Set (as spec says) or Array (as implemented)?
