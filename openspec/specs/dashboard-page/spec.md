---
status: implemented
---

# CnDashboardPage Specification

## Purpose

`CnDashboardPage` is a top-level dashboard page component that assembles a header, a `CnDashboardGrid`, and widget rendering with automatic widget type detection. It is the dashboard equivalent of `CnIndexPage` — a single component that handles the full dashboard page lifecycle.

---

## Requirements

### Requirement: page header rendering

CnDashboardPage SHALL render a page header containing a title, an optional description, optional header action slots, and an optional edit toggle button.

#### Scenario: header displays title and description

- GIVEN `title` is `'My Dashboard'` and `description` is `'Overview of metrics'`
- WHEN the component renders
- THEN the header shows "My Dashboard" as an `<h2>` heading and "Overview of metrics" as a `<p>` below it

#### Scenario: title hidden when empty

- GIVEN `title` is `''` (empty string)
- WHEN the component renders
- THEN no `<h2>` element is rendered in the header

#### Scenario: description hidden when empty

- GIVEN `description` is `''`
- WHEN the component renders
- THEN no `<p>` element is rendered in the header

#### Scenario: custom header actions via slot

- GIVEN the `#header-actions` slot is provided with a refresh button
- WHEN the component renders
- THEN the slot content appears in the header actions area to the left of the edit toggle button

---

### Requirement: widget type resolution

CnDashboardPage SHALL resolve the widget type for each layout item in the following priority order: (1) tile widget, (2) custom scoped slot, (3) NC Dashboard API widget, (4) unknown fallback. The widget definition is looked up from the `widgets` array using the layout item's `widgetId` field.

#### Scenario: tile widget detection

- GIVEN a layout item with `widgetId: 'quick-link'` and the matching widget definition has `type: 'tile'`
- WHEN the grid renders that item
- THEN `CnTileWidget` is rendered with tile config extracted from the widget definition (title, icon, iconType, backgroundColor, textColor, linkType, linkValue)

#### Scenario: custom widget via scoped slot

- GIVEN a layout item with `widgetId: 'kpis'` and `#widget-kpis` scoped slot is provided and the widget definition does NOT have `type: 'tile'`
- WHEN the grid renders that item
- THEN the scoped slot content is rendered inside a `CnWidgetWrapper` with `{ item, widget }` as slot props

#### Scenario: NC Dashboard API widget

- GIVEN a layout item with `widgetId: 'weather'` and the widget definition has `itemApiVersions: [1, 2]` and no `#widget-weather` slot exists and type is not `'tile'`
- WHEN the grid renders that item
- THEN `CnWidgetRenderer` is rendered inside a `CnWidgetWrapper`, auto-fetching items from the NC Dashboard API

#### Scenario: unknown widget fallback

- GIVEN a layout item with `widgetId: 'mystery'` and no matching slot, no `itemApiVersions`, and type is not `'tile'`
- WHEN the grid renders that item
- THEN a `CnWidgetWrapper` is rendered containing the `unavailableLabel` text

---

### Requirement: widget wrapper metadata pass-through

CnDashboardPage SHALL pass widget metadata from both the widget definition and the layout item to the `CnWidgetWrapper` for custom and NC API widgets.

#### Scenario: widget title from definition

- GIVEN a widget definition with `title: 'Popular Terms'` and no `customTitle` on the layout item
- WHEN the widget renders
- THEN `CnWidgetWrapper` receives `title: 'Popular Terms'`

#### Scenario: custom title override from layout item

- GIVEN a widget definition with `title: 'Popular Terms'` and the layout item has `customTitle: 'Top Searches'`
- WHEN the widget renders
- THEN `CnWidgetWrapper` receives `title: 'Top Searches'` (customTitle takes precedence)

#### Scenario: icon and button pass-through

- GIVEN a widget definition with `iconUrl: '/icon.svg'`, `iconClass: 'icon-calendar'`, and `buttons: [{ text: 'More', link: '/more' }]`
- WHEN the widget renders
- THEN `CnWidgetWrapper` receives the corresponding `iconUrl`, `iconClass`, and `buttons` props

#### Scenario: showTitle controlled by layout item

- GIVEN a layout item with `showTitle: false`
- WHEN the widget renders
- THEN `CnWidgetWrapper` receives `showTitle: false` and the widget header is hidden

#### Scenario: styleConfig pass-through

- GIVEN a layout item with `styleConfig: { backgroundColor: '#f0f0f0', borderStyle: 'solid', borderWidth: 2 }`
- WHEN the widget renders
- THEN `CnWidgetWrapper` receives the `styleConfig` and applies the corresponding CSS styles

---

### Requirement: GridStack grid layout

CnDashboardPage SHALL delegate widget positioning to `CnDashboardGrid`, which uses the GridStack library to render widgets in a configurable column-based grid.

#### Scenario: grid uses configured columns and cell height

- GIVEN `columns` is `12` and `cellHeight` is `80`
- WHEN the grid initializes
- THEN GridStack is initialized with `column: 12` and `cellHeight: 80`

#### Scenario: grid positions widgets according to layout

- GIVEN a layout with items at `{ gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 3 }` and `{ gridX: 6, gridY: 0, gridWidth: 6, gridHeight: 3 }`
- WHEN the grid renders
- THEN two widgets appear side by side, each occupying half the 12-column grid

#### Scenario: grid margin applied

- GIVEN `gridMargin` is `12`
- WHEN the grid renders
- THEN GridStack uses a 12px margin between grid cells

---

### Requirement: drag-and-drop editing

CnDashboardPage SHALL support a drag-and-drop edit mode that allows users to reposition and resize widgets in the grid.

#### Scenario: edit button toggles edit mode on

- GIVEN `allowEdit` is `true` and the dashboard is in view mode
- WHEN the user clicks the edit button (shows Pencil icon and `editLabel` text)
- THEN the grid becomes editable (drag and resize enabled), the button changes to a primary button with Check icon and `doneLabel` text, and `@edit-toggle(true)` is emitted

#### Scenario: done button exits edit mode

- GIVEN the dashboard is in edit mode
- WHEN the user clicks the done button
- THEN the grid becomes read-only (drag and resize disabled), the button changes back to secondary with Pencil icon, and `@edit-toggle(false)` is emitted

#### Scenario: edit button hidden when not allowed

- GIVEN `allowEdit` is `false`
- WHEN the component renders
- THEN no edit/done toggle button is shown in the header

#### Scenario: drag repositions widget

- GIVEN the grid is in edit mode
- WHEN the user drags a widget from `{ gridX: 0, gridY: 0 }` to `{ gridX: 3, gridY: 2 }`
- THEN `@layout-change` is emitted with the updated layout array reflecting the new position

#### Scenario: resize changes widget dimensions

- GIVEN the grid is in edit mode
- WHEN the user resizes a widget from `{ gridWidth: 6, gridHeight: 3 }` to `{ gridWidth: 8, gridHeight: 4 }`
- THEN `@layout-change` is emitted with the updated layout array reflecting the new dimensions

---

### Requirement: layout persistence via props and events

CnDashboardPage SHALL receive layout data via the `layout` prop and emit changes via `@layout-change`, enabling the parent to persist layout state however it chooses (app config, OpenRegister objects, etc.).

#### Scenario: layout loaded from saved state

- GIVEN the parent passes a previously saved `layout` array with 4 items
- WHEN the component renders
- THEN 4 widgets appear in the grid at their saved positions

#### Scenario: layout change emitted on drag or resize

- GIVEN the grid is in edit mode and a widget is moved
- WHEN GridStack fires a change event
- THEN `@layout-change` is emitted with the full updated layout array (all items, not just the changed one)

#### Scenario: layout sync when items added externally

- GIVEN the parent adds a new item to the `layout` prop
- WHEN the layout watcher triggers
- THEN CnDashboardGrid calls `grid.makeWidget()` to register the new DOM element with GridStack

#### Scenario: layout sync when items removed externally

- GIVEN the parent removes an item from the `layout` prop
- WHEN the layout watcher triggers
- THEN CnDashboardGrid calls `grid.removeWidget()` to unregister the removed element from GridStack

---

### Requirement: NC Dashboard Widget API integration

CnDashboardPage SHALL support rendering Nextcloud Dashboard API widgets (v1 and v2) via the `CnWidgetRenderer` component, which fetches widget items from the OCS endpoint.

#### Scenario: v2 API preferred over v1

- GIVEN a widget definition with `itemApiVersions: [1, 2]`
- WHEN CnWidgetRenderer loads items
- THEN it fetches from `/apps/dashboard/api/v2/widget-items` (v2 is preferred when available)

#### Scenario: v1 API fallback

- GIVEN a widget definition with `itemApiVersions: [1]`
- WHEN CnWidgetRenderer loads items
- THEN it fetches from `/apps/dashboard/api/v1/widget-items`

#### Scenario: auto-refresh for NC widgets

- GIVEN a widget definition with `reloadInterval: 300` (5 minutes)
- WHEN the widget is mounted
- THEN items are loaded immediately, and a `setInterval` is created to reload items every 300 seconds

#### Scenario: auto-refresh cleanup on destroy

- GIVEN a widget with an active auto-refresh interval
- WHEN the component is destroyed
- THEN `clearInterval` is called to prevent memory leaks

#### Scenario: NC widget loading via useDashboardView

- GIVEN `useDashboardView` is called with `includeNcWidgets: true`
- WHEN the composable initializes
- THEN it fetches widget definitions from `/apps/dashboard/api/v1/widgets` and merges them with app-defined widgets

---

### Requirement: empty state

CnDashboardPage SHALL display an empty state when no widgets are configured in the layout.

#### Scenario: default empty state

- GIVEN `layout` is an empty array and no `#empty` slot is provided
- WHEN the component renders
- THEN `NcEmptyContent` is shown with a `ViewDashboardOutline` icon and the `emptyLabel` text

#### Scenario: custom empty state via slot

- GIVEN `layout` is empty and `#empty` slot is provided with custom content
- WHEN the component renders
- THEN the slot content is rendered instead of the default `NcEmptyContent`

#### Scenario: loading state takes precedence

- GIVEN `loading` is `true` and `layout` is empty
- WHEN the component renders
- THEN `NcLoadingIcon` is shown instead of the empty state

---

### Requirement: responsive grid columns

CnDashboardPage SHALL support configurable grid columns via the `columns` prop, allowing dashboards to use different grid densities.

#### Scenario: 12-column default grid

- GIVEN `columns` is not specified
- WHEN the grid renders
- THEN GridStack uses 12 columns (the default)

#### Scenario: custom column count

- GIVEN `columns` is `6`
- WHEN the grid renders
- THEN GridStack uses 6 columns, and layout items with `gridWidth: 6` span the full width

---

### Requirement: NL Design theming

CnDashboardPage SHALL use only Nextcloud CSS variables for all visual styling, ensuring automatic compatibility with NL Design System themes applied by the nldesign app.

#### Scenario: description text uses theme color

- GIVEN an NL Design theme is active that overrides `--color-text-maxcontrast`
- WHEN the dashboard renders
- THEN the description text uses the themed color value

#### Scenario: widget wrapper uses theme border color

- GIVEN an NL Design theme is active
- WHEN a widget wrapper renders with default styling
- THEN borders use `var(--color-border)` and backgrounds use `var(--color-main-background)`

#### Scenario: grid placeholder uses theme primary color

- GIVEN the grid is in edit mode and the user drags a widget
- WHEN the drag placeholder appears
- THEN its background uses `var(--color-primary-element-light)` and its border uses `var(--color-primary-element)`

---

### Requirement: props have safe defaults

All props SHALL have default values so existing consumers are not broken when new props are added.

#### Scenario: minimal props render without error

- GIVEN only `widgets` and `layout` are provided
- WHEN the component renders
- THEN it uses default values: `title` (`''`), `description` (`''`), `loading` (`false`), `allowEdit` (`false`), `columns` (`12`), `cellHeight` (`80`), `gridMargin` (`12`), `editLabel` (`'Edit'`), `doneLabel` (`'Done'`), `emptyLabel` (`'No widgets configured'`), `unavailableLabel` (`'Widget not available'`)

#### Scenario: label props enable translation

- GIVEN `editLabel` is `'Bewerken'` and `doneLabel` is `'Klaar'` and `emptyLabel` is `'Geen widgets geconfigureerd'`
- WHEN the component renders in Dutch
- THEN all UI strings display in Dutch without the component importing any translation function

---

### Requirement: events API

CnDashboardPage SHALL emit the following events to enable parent components to react to user interactions.

#### Scenario: layout-change event

- GIVEN the grid is in edit mode and a widget is moved
- WHEN GridStack fires a change event
- THEN `@layout-change` is emitted with the full updated layout array as payload

#### Scenario: edit-toggle event

- GIVEN `allowEdit` is `true`
- WHEN the user clicks the edit/done button
- THEN `@edit-toggle` is emitted with `true` (entering edit mode) or `false` (leaving edit mode)

---

### Requirement: widget add and remove in edit mode

The `useDashboardView` composable SHALL support adding and removing widgets from the dashboard layout.

#### Scenario: add widget at next available position

- GIVEN the composable's `addWidget('chart')` is called with no position override
- WHEN the function executes
- THEN a new layout item is appended with `widgetId: 'chart'`, `gridX: 0`, `gridY` set to the bottom of the current layout, `gridWidth: 6`, `gridHeight: 3`, and a unique auto-incremented `id`

#### Scenario: add widget at specific position

- GIVEN `addWidget('chart', { gridX: 6, gridY: 0, gridWidth: 4, gridHeight: 2 })` is called
- WHEN the function executes
- THEN a new layout item is appended at the specified position with the specified dimensions

#### Scenario: remove widget by layout item ID

- GIVEN the layout contains an item with `id: 5`
- WHEN `removeWidget(5)` is called
- THEN the item with `id: 5` is removed from the layout and `saveLayout` is called (if configured)

#### Scenario: available widgets computed

- GIVEN `widgets` contains 8 definitions and `layout` contains 6 items referencing 6 of them
- WHEN `availableWidgets` is accessed
- THEN it returns the 2 widget definitions not currently placed on the dashboard

---

### Requirement: accessibility

CnDashboardPage SHALL provide accessible markup and controls for keyboard and screen reader users.

#### Scenario: edit button has accessible label

- GIVEN `allowEdit` is `true`
- WHEN the edit button renders
- THEN it is a standard `NcButton` with visible text (`editLabel` or `doneLabel`) and an icon, providing both visual and screen reader context

#### Scenario: header uses semantic heading

- GIVEN `title` is `'Dashboard'`
- WHEN the header renders
- THEN the title is wrapped in an `<h2>` element for proper document outline

#### Scenario: empty state uses NcEmptyContent

- GIVEN `layout` is empty
- WHEN the empty state renders
- THEN `NcEmptyContent` is used, which provides proper ARIA attributes for the empty state message

---

## Current Implementation Status

**Fully implemented** in `src/components/CnDashboardPage/CnDashboardPage.vue` (390 lines).

**Page header rendering (implemented):**
- Header with title (`<h2>`) and description (`<p>`) rendered conditionally
- Edit toggle button using NcButton with Pencil/Check icons
- `#header-actions` slot for custom header buttons
- Empty state using NcEmptyContent with ViewDashboardOutline icon and `#empty` slot override
- Loading state using NcLoadingIcon

**Widget type resolution (implemented, priority order):**
1. **Tile widgets** — Checked first via `isTile(item)` (widget def has `type: 'tile'`), rendered as CnTileWidget
2. **Custom slot widgets** — `hasWidgetSlot(widgetId)` checks `$scopedSlots['widget-' + widgetId]`, wrapped in CnWidgetWrapper
3. **NC Dashboard API widgets** — `isNcWidget(item)` checks for `itemApiVersions`, rendered via CnWidgetRenderer inside CnWidgetWrapper
4. **Unknown fallback** — CnWidgetWrapper with unavailableLabel text

**Edit mode (implemented):**
- `toggleEdit()` flips `isEditing` data, emits `@edit-toggle(isEditing)`
- `allowEdit` prop controls visibility of the edit button
- `isEditing` passed to CnDashboardGrid's `editable` prop

**Layout change propagation (implemented):**
- `onLayoutChange(updated)` forwards to `$emit('layout-change', updated)`

**Props (all have defaults):**
| Prop | Type | Default |
|------|------|---------|
| `title` | String | `''` |
| `description` | String | `''` |
| `widgets` | Array | `[]` |
| `layout` | Array | `[]` |
| `loading` | Boolean | `false` |
| `allowEdit` | Boolean | `false` |
| `columns` | Number | `12` |
| `cellHeight` | Number | `80` |
| `gridMargin` | Number | `12` |
| `editLabel` | String | `'Edit'` |
| `doneLabel` | String | `'Done'` |
| `emptyLabel` | String | `'No widgets configured'` |
| `unavailableLabel` | String | `'Widget not available'` |

**Emits:** `layout-change`, `edit-toggle`

**Sub-components used:** NcButton, NcEmptyContent, NcLoadingIcon, CnDashboardGrid, CnWidgetWrapper, CnWidgetRenderer, CnTileWidget

**Composable:** `useDashboardView` in `src/composables/useDashboardView.js` — manages widget definitions (app + NC), layout state, add/remove, and persistence via async callbacks.

**Consumer apps:** OpenRegister uses CnDashboardPage with 8 custom widgets (KPIs, tables, charts) in `src/views/dashboard/DashboardIndex.vue`.

## Standards & References

- **Vue 2 Options API** — Standard component structure
- **Nextcloud Vue** — Uses NcButton, NcEmptyContent, NcLoadingIcon, NcDashboardWidget from `@nextcloud/vue`
- **GridStack** — Grid layout engine via `gridstack` npm package
- **MDI icons** — Pencil, Check, ViewDashboardOutline from `vue-material-design-icons`
- **CSS** — `cn-dashboard-page` / `cn-dashboard-grid` / `cn-widget-wrapper` prefixes, Nextcloud CSS variables, scoped styles
- **Translation** — All user-visible text configurable via props with English defaults; apps pass pre-translated strings
- **OCS API** — NC Dashboard widget discovery at `/apps/dashboard/api/v1/widgets`, items at `/apps/dashboard/api/v{1,2}/widget-items`
