# useDashboardView Specification

## Purpose

`useDashboardView(options)` is a composable exported by `@conduction/nextcloud-vue` that manages dashboard state: widget definitions, layout, NC Dashboard API widget loading, and layout persistence. It is the dashboard equivalent of `useListView` — the composable that handles all the state management a `CnDashboardPage` needs.

---

## Requirements

### Requirement: Widget definitions initialization

useDashboardView SHALL accept an `options.widgets` array and expose a merged `widgets` computed ref containing both app-defined and NC Dashboard API widgets.

#### Scenario: Static widgets provided at initialization

- GIVEN `options.widgets` contains `[{ id: 'kpis', title: 'KPIs', type: 'custom' }, { id: 'chart', title: 'Chart', type: 'custom' }]`
- WHEN the composable is initialized
- THEN `widgets.value` contains both widget definitions

#### Scenario: Empty widgets array by default

- GIVEN `options.widgets` is not provided
- WHEN the composable is initialized
- THEN `widgets.value` is an empty array

---

### Requirement: Dynamic widget updates via setWidgets

useDashboardView SHALL expose a `setWidgets(newWidgets)` function that replaces the app-defined widget list reactively.

#### Scenario: setWidgets replaces the entire widget list

- GIVEN the composable was initialized with widgets `[{ id: 'a' }, { id: 'b' }]`
- WHEN `setWidgets([{ id: 'c', title: 'New' }])` is called
- THEN `widgets.value` contains only the new widget (plus any NC widgets)
- AND the previous app widgets are no longer present

---

### Requirement: Default layout fallback

useDashboardView SHALL use `options.defaultLayout` as the initial layout when no persisted layout is available.

#### Scenario: No loadLayout function provided

- GIVEN `options.loadLayout` is not provided and `options.defaultLayout` contains a 3-item layout
- WHEN the component is mounted and `init()` runs
- THEN `layout.value` equals a copy of the default layout

#### Scenario: loadLayout returns null or empty array

- GIVEN `options.loadLayout` returns `null` and `options.defaultLayout` has 2 items
- WHEN `init()` runs
- THEN `layout.value` equals the default layout

---

### Requirement: Layout persistence — async load

useDashboardView SHALL call `options.loadLayout()` during initialization and use the returned layout if non-empty.

#### Scenario: Persisted layout loaded successfully

- GIVEN `options.loadLayout` is an async function that resolves with `[{ id: 1, widgetId: 'kpis', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 4 }]`
- WHEN `init()` runs
- THEN `layout.value` equals the persisted layout (not the default)

#### Scenario: loadLayout rejects with an error

- GIVEN `options.loadLayout` rejects with a network error
- WHEN `init()` runs
- THEN `layout.value` falls back to a copy of `options.defaultLayout`
- AND the error is logged to `console.error`

---

### Requirement: Layout persistence — async save

useDashboardView SHALL call `options.saveLayout(newLayout)` when the layout changes, if provided.

#### Scenario: onLayoutChange triggers save

- GIVEN `options.saveLayout` is an async function
- WHEN `onLayoutChange(newLayout)` is called
- THEN `layout.value` is updated to `newLayout`
- AND `options.saveLayout(newLayout)` is called with the new layout

#### Scenario: No saveLayout provided

- GIVEN `options.saveLayout` is not provided
- WHEN `onLayoutChange(newLayout)` is called
- THEN `layout.value` is updated
- AND no persistence call is made and no error is thrown

#### Scenario: saveLayout rejects with an error

- GIVEN `options.saveLayout` rejects with an error
- WHEN `onLayoutChange(newLayout)` is called
- THEN `layout.value` is still updated to `newLayout`
- AND the error is logged to `console.error`
- AND `saving.value` returns to `false`

---

### Requirement: NC Dashboard API widget loading

When `options.includeNcWidgets` is `true`, useDashboardView SHALL fetch widgets from the Nextcloud OCS Dashboard API and merge them into the widget list.

#### Scenario: NC widgets merged with static widgets

- GIVEN `options.widgets` has 2 static widgets and `options.includeNcWidgets` is `true`
- WHEN the OCS API at `/apps/dashboard/api/v1/widgets` returns 3 NC dashboard widgets
- THEN `widgets.value` contains 5 widgets total (2 static + 3 NC API)
- AND each NC widget has `type: 'nc-widget'` and normalized fields (`id`, `title`, `iconClass`, `iconUrl`, `widgetUrl`, `itemApiVersions`, `itemIconsRound`, `reloadInterval`, `buttons`)

#### Scenario: NC widget loading skipped when disabled

- GIVEN `options.includeNcWidgets` is `false` (the default)
- WHEN `init()` runs
- THEN no OCS API request is made
- AND `widgets.value` contains only static app widgets

#### Scenario: NC widget API call fails

- GIVEN `options.includeNcWidgets` is `true`
- WHEN the OCS API request fails with a network error
- THEN `ncWidgets.value` is set to an empty array
- AND the error is logged to `console.error`
- AND initialization continues without failing

---

### Requirement: Add widget to layout

useDashboardView SHALL expose an `addWidget(widgetId, position?)` function that places a widget on the dashboard at the next available grid position.

#### Scenario: addWidget with default position

- GIVEN `layout.value` has 2 items with max bottom edge at gridY=6
- WHEN `addWidget('chart')` is called without a position argument
- THEN `layout.value` has 3 items
- AND the new item has `widgetId: 'chart'`, `gridX: 0`, `gridY: 6`, `gridWidth: 6`, `gridHeight: 3`
- AND the new item's `id` is one greater than the highest existing numeric ID

#### Scenario: addWidget with custom position override

- GIVEN `layout.value` has 1 item
- WHEN `addWidget('chart', { gridX: 6, gridY: 0, gridWidth: 6, gridHeight: 4 })` is called
- THEN the new item uses the provided position values

#### Scenario: addWidget triggers layout persistence

- GIVEN `options.saveLayout` is provided
- WHEN `addWidget('chart')` is called
- THEN `onLayoutChange` is called with the new layout array
- AND `options.saveLayout` is invoked

---

### Requirement: Remove widget from layout

useDashboardView SHALL expose a `removeWidget(itemId)` function that removes a layout item by its layout item ID.

#### Scenario: removeWidget removes the item

- GIVEN `layout.value` has 3 items with IDs 1, 2, 3
- WHEN `removeWidget(2)` is called
- THEN `layout.value` has 2 items (IDs 1 and 3)

#### Scenario: removeWidget triggers layout persistence

- GIVEN `options.saveLayout` is provided
- WHEN `removeWidget(1)` is called
- THEN `onLayoutChange` is called with the filtered layout
- AND `options.saveLayout` is invoked

#### Scenario: removeWidget with non-existent ID is a no-op

- GIVEN `layout.value` has 2 items with IDs 1 and 2
- WHEN `removeWidget(99)` is called
- THEN `layout.value` still has 2 items (unchanged)

---

### Requirement: Available widget computation

useDashboardView SHALL expose `activeWidgetIds` and `availableWidgets` computed refs to track which widgets are on the dashboard and which can be added.

#### Scenario: activeWidgetIds reflects current layout

- GIVEN `layout.value` contains items with `widgetId: 'kpis'` and `widgetId: 'chart'`
- WHEN `activeWidgetIds.value` is accessed
- THEN it is an array containing `['kpis', 'chart']`

#### Scenario: availableWidgets excludes active ones

- GIVEN `widgets.value` has 4 widgets with IDs `['kpis', 'chart', 'tasks', 'calendar']`
- AND `activeWidgetIds.value` contains `['kpis', 'chart']`
- WHEN `availableWidgets.value` is accessed
- THEN it contains the 2 widgets with IDs `'tasks'` and `'calendar'`

#### Scenario: All widgets placed means no available widgets

- GIVEN all widget IDs appear in the layout
- WHEN `availableWidgets.value` is accessed
- THEN it is an empty array

---

### Requirement: Loading and saving state indicators

useDashboardView SHALL expose `loading` and `saving` boolean refs that reflect whether async operations are in progress.

#### Scenario: loading is true during init

- GIVEN `options.loadLayout` is an async function
- WHEN `init()` is called
- THEN `loading.value` is `true` until all init tasks (loadLayout + loadNcWidgets) complete
- AND `loading.value` is `false` after completion

#### Scenario: saving is true during save

- GIVEN `options.saveLayout` is an async function that takes 200ms
- WHEN `onLayoutChange(newLayout)` is called
- THEN `saving.value` is `true` during the save
- AND `saving.value` is `false` after the save completes or fails

#### Scenario: loading remains false when no async tasks

- GIVEN neither `loadLayout` nor `includeNcWidgets` is set
- WHEN `init()` runs
- THEN `loading.value` transitions to `true` and back to `false` synchronously (within the same tick)

---

### Requirement: Edit mode state

useDashboardView SHALL expose an `isEditing` ref that consumers can use to toggle dashboard edit mode.

#### Scenario: isEditing defaults to false

- GIVEN the composable is initialized
- WHEN `isEditing.value` is accessed before any interaction
- THEN it is `false`

#### Scenario: isEditing can be toggled

- GIVEN the composable is initialized
- WHEN `isEditing.value` is set to `true`
- THEN `isEditing.value` reads as `true`

---

### Requirement: Auto-initialization on mount

useDashboardView SHALL automatically call `init()` via `onMounted`, so consumers do not need to call it manually.

#### Scenario: init runs on component mount

- GIVEN the composable is used inside a Vue component's `setup()`
- WHEN the component is mounted
- THEN `init()` is invoked automatically
- AND `loading.value` transitions from `false` to `true` and back to `false`

#### Scenario: Manual re-initialization via exposed init

- GIVEN the component has already been mounted and `init()` has completed
- WHEN `init()` is called manually
- THEN the layout is reloaded from `loadLayout` (or reset to default)
- AND NC widgets are reloaded if `includeNcWidgets` is `true`

---

### Requirement: Error resilience during initialization

useDashboardView SHALL gracefully handle errors during initialization without leaving the composable in a broken state.

#### Scenario: Both loadLayout and loadNcWidgets fail

- GIVEN `options.loadLayout` rejects and `options.includeNcWidgets` is `true` and the OCS API also fails
- WHEN `init()` runs
- THEN `layout.value` falls back to `options.defaultLayout`
- AND `ncWidgets.value` is an empty array
- AND `loading.value` is `false`
- AND errors are logged to `console.error`

#### Scenario: Partial failure — loadLayout succeeds but NC widgets fail

- GIVEN `options.loadLayout` resolves with a saved layout and NC widgets API fails
- WHEN `init()` runs
- THEN `layout.value` uses the saved layout
- AND `ncWidgets.value` is an empty array
- AND `loading.value` is `false`

---

### Requirement: Grid columns option

useDashboardView SHALL accept an `options.columns` parameter (default 12) that is passed through for layout calculations.

#### Scenario: Default columns is 12

- GIVEN `options.columns` is not specified
- WHEN the composable is initialized
- THEN the internal options object has `columns: 12`

#### Scenario: Custom columns value

- GIVEN `options.columns` is set to `6`
- WHEN the composable is initialized
- THEN the options object reflects `columns: 6`

---

### Requirement: Returned API surface

useDashboardView SHALL return a well-defined object containing state refs, computed refs, and methods.

#### Scenario: All expected properties are returned

- GIVEN the composable is initialized with any valid options
- WHEN the return value is destructured
- THEN it contains the state refs: `widgets`, `layout`, `loading`, `saving`, `isEditing`
- AND the derived refs: `activeWidgetIds`, `availableWidgets`, `ncWidgets`
- AND the methods: `onLayoutChange`, `addWidget`, `removeWidget`, `setWidgets`, `init`

---

## Current Implementation Status

**Already implemented -- all requirements are fulfilled:**

- **File**: `src/composables/useDashboardView.js`
- **Widget management**: `appWidgets` ref initialized from `options.widgets`. `setWidgets(newWidgets)` replaces app widgets. `widgets` computed merges `appWidgets` and `ncWidgets`.
- **Layout management**: `layout` ref. `init()` loads via `opts.loadLayout()` or falls back to `opts.defaultLayout`. `onLayoutChange(newLayout)` updates layout and calls `opts.saveLayout()` if provided.
- **NC Dashboard API widget loading**: `loadNcWidgets()` fetches from OCS endpoint `/apps/dashboard/api/v1/widgets` via axios. Transforms to normalized format with `type: 'nc-widget'`. Only called when `opts.includeNcWidgets` is true.
- **Add/remove widgets**: `addWidget(widgetId, position)` calculates next available position (max Y + height), assigns incrementing ID. `removeWidget(itemId)` filters by layout item ID.
- **Computed helpers**: `activeWidgetIds` returns array of widgetIds from layout. `availableWidgets` filters widgets not in activeWidgetIds.
- **Loading/saving states**: `loading` ref true during `init()`, `saving` ref true during `onLayoutChange` save.
- **Edit mode**: `isEditing` ref for edit mode state.
- **Lifecycle**: `onMounted(() => init())` auto-initializes. `init()` also exposed for manual re-initialization.
- **Error handling**: try/catch in `init()`, `loadNcWidgets()`, `onLayoutChange()` with console.error logging and graceful fallback to defaults.

**Not yet implemented:**
- All spec requirements are implemented.

## Standards & References

- Vue 3 Composition API (`ref`, `computed`, `onMounted`)
- Nextcloud OCS API: `/apps/dashboard/api/v1/widgets` for widget discovery (IManager::getWidgets)
- `@nextcloud/axios` for HTTP requests
- `@nextcloud/router` (`generateOcsUrl`) for OCS URL generation
