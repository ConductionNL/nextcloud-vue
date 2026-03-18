# CnDashboardPage Specification

## Purpose

`CnDashboardPage` is a top-level dashboard page component that assembles a header, a `CnDashboardGrid`, and widget rendering with automatic widget type detection. It is the dashboard equivalent of `CnIndexPage` — a single component that handles the full dashboard page lifecycle.

---

## ADDED Requirements

### Requirement: page layout

CnDashboardPage SHALL render a page header with title and description, an optional edit toggle button, and a grid of widgets. When no widgets are in the layout, it SHALL show an empty state.

#### Scenario: header displays title and description

- GIVEN `title` is `'My Dashboard'` and `description` is `'Overview of metrics'`
- WHEN the component renders
- THEN the header shows "My Dashboard" as heading and "Overview of metrics" as description

#### Scenario: empty state shown when no layout items

- GIVEN `layout` is an empty array
- WHEN the component renders
- THEN the empty state message is displayed (default: "No widgets configured")

#### Scenario: custom empty state via slot

- GIVEN `layout` is empty and `#empty` slot is provided
- WHEN the component renders
- THEN the slot content is rendered instead of the default empty message

---

### Requirement: widget type resolution

CnDashboardPage SHALL resolve the widget type for each layout item in priority order: (1) custom scoped slot, (2) NC Dashboard API widget, (3) tile widget, (4) unknown fallback.

#### Scenario: custom widget via scoped slot

- GIVEN a widget with `id: 'kpis'` and `#widget-kpis` scoped slot is provided
- WHEN the grid renders that widget
- THEN the scoped slot content is rendered with `{ item, widget }` as slot props

#### Scenario: NC Dashboard API widget

- GIVEN a widget with `id: 'weather'` and `itemApiVersions: [1, 2]` and no `#widget-weather` slot
- WHEN the grid renders that widget
- THEN `CnWidgetRenderer` is used to render the NC Dashboard API widget

#### Scenario: tile widget

- GIVEN a widget with `id: 'link'` and `type: 'tile'` and no `#widget-link` slot and no `itemApiVersions`
- WHEN the grid renders that widget
- THEN `CnTileWidget` is used to render the tile

#### Scenario: unknown widget fallback

- GIVEN a widget with `id: 'mystery'` and no slot, no `itemApiVersions`, and `type` is not `'tile'`
- WHEN the grid renders that widget
- THEN a fallback "unknown widget" message is displayed

---

### Requirement: edit mode

CnDashboardPage SHALL support an edit mode toggle that enables drag/drop and resize on the grid.

#### Scenario: edit button toggles edit mode

- GIVEN `allowEdit` is `true`
- WHEN the user clicks the edit button
- THEN the grid becomes editable (drag/drop/resize enabled) and `@edit-toggle(true)` is emitted

#### Scenario: done button exits edit mode

- GIVEN the grid is in edit mode
- WHEN the user clicks the done button
- THEN the grid becomes read-only and `@edit-toggle(false)` is emitted

#### Scenario: edit button hidden when not allowed

- GIVEN `allowEdit` is `false`
- WHEN the component renders
- THEN no edit/done toggle button is shown

---

### Requirement: layout change propagation

CnDashboardPage SHALL forward layout changes from the grid to the parent via `@layout-change`.

#### Scenario: drag/resize emits layout change

- GIVEN the grid is in edit mode
- WHEN the user drags or resizes a widget
- THEN `@layout-change` is emitted with the updated layout array

---

### Requirement: props have safe defaults

All props SHALL have defaults so existing consumers are not broken when new props are added.

#### Scenario: minimal props render without error

- GIVEN only `widgets` and `layout` are provided
- WHEN the component renders
- THEN it uses default values for `title` ('Dashboard'), `columns` (12), `cellHeight` (80), etc.

---

### Current Implementation Status

**Fully implemented** in `src/components/CnDashboardPage/CnDashboardPage.vue` (390 lines).

**Page layout (implemented):**
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

**Note:** The implementation checks tile BEFORE custom slot, which differs slightly from the spec's stated priority (spec says custom slot first, then NC API, then tile). In practice, tiles rarely have custom slots so this rarely matters.

**Edit mode (implemented):**
- `toggleEdit()` flips `isEditing` data, emits `@edit-toggle(isEditing)`
- `allowEdit` prop controls visibility of the edit button
- `isEditing` passed to CnDashboardGrid's `editable` prop

**Layout change propagation (implemented):**
- `onLayoutChange(updated)` forwards to `$emit('layout-change', updated)`

**Props (all have defaults):**
| Prop | Type | Default | Spec Default |
|------|------|---------|-------------|
| `title` | String | `''` | `'Dashboard'` |
| `description` | String | `''` | - |
| `widgets` | Array | `[]` | - |
| `layout` | Array | `[]` | - |
| `loading` | Boolean | `false` | - |
| `allowEdit` | Boolean | `false` | - |
| `columns` | Number | `12` | `12` |
| `cellHeight` | Number | `80` | `80` |
| `gridMargin` | Number | `12` | - |
| `editLabel` | String | `'Edit'` | - |
| `doneLabel` | String | `'Done'` | - |
| `emptyLabel` | String | `'No widgets configured'` | - |
| `unavailableLabel` | String | `'Widget not available'` | - |

**Note:** The spec says `title` defaults to `'Dashboard'` but the implementation defaults to `''` (empty string).

**Emits:** `layout-change`, `edit-toggle`

**Sub-components used:** NcButton, NcEmptyContent, NcLoadingIcon, CnDashboardGrid, CnWidgetWrapper, CnWidgetRenderer, CnTileWidget

**Not yet implemented / deviations:**
- Title default is `''` not `'Dashboard'` as spec states
- Widget type priority: implementation checks tile before custom slot; spec says custom slot has highest priority

### Standards & References

- **Vue 2 Options API** — Standard component structure
- **Nextcloud Vue** — Uses NcButton, NcEmptyContent, NcLoadingIcon from `@nextcloud/vue`
- **MDI icons** — Pencil, Check, ViewDashboardOutline from `vue-material-design-icons`
- **CSS** — `cn-dashboard-page` prefix, Nextcloud CSS variables, scoped styles
- **Translation** — All user-visible text configurable via props with English defaults

### Specificity Assessment

- **Specific enough?** Yes, scenarios cover all major behaviors and edge cases.
- **Missing/ambiguous:**
  - The `gridMargin` prop is not mentioned in the spec
  - The `#header-actions` slot is not specified
  - The `unavailableLabel` prop is not specified (only the concept of an "unknown widget" message)
  - No requirement for the `widgetMap` computed property or helper methods (`getWidgetDef`, `getWidgetTitle`, `getWidgetIconUrl`, etc.)
  - No requirement for `styleConfig` pass-through on layout items
  - The `isTile` check priority vs custom slot priority mismatch should be resolved
- **Open questions:**
  - Should `title` default to `'Dashboard'` (spec) or `''` (implementation)?
  - Should tile widgets take priority over custom slots, or vice versa?
  - Should there be a requirement for the `customTitle` override on layout items?
