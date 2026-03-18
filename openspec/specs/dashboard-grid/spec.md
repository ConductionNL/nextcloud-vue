# CnDashboardGrid Specification

## Purpose

`CnDashboardGrid` is the core grid layout engine that wraps GridStack.js. It manages grid initialization, item positioning, drag/drop, resize, and layout synchronization. It is a low-level component used internally by `CnDashboardPage`.

---

## ADDED Requirements

### Requirement: grid initialization

CnDashboardGrid SHALL initialize a GridStack instance on mount with the configured columns, cell height, and margin.

#### Scenario: grid renders with layout items

- GIVEN `layout` contains 3 items with positions
- WHEN the component mounts
- THEN GridStack is initialized and all 3 items are rendered at their specified grid positions

#### Scenario: grid respects column count

- GIVEN `columns` is `12`
- WHEN a layout item has `gridWidth: 6`
- THEN the item occupies half the grid width

#### Scenario: grid uses configured cell height

- GIVEN `cellHeight` is `80`
- WHEN a layout item has `gridHeight: 2`
- THEN the item is 160px tall

---

### Requirement: drag and resize

CnDashboardGrid SHALL enable drag and resize only when `editable` is `true`.

#### Scenario: drag enabled in edit mode

- GIVEN `editable` is `true`
- WHEN the user drags a widget
- THEN the widget moves to the new grid position

#### Scenario: drag disabled in view mode

- GIVEN `editable` is `false`
- WHEN the user attempts to drag a widget
- THEN the widget does not move

#### Scenario: resize respects minimum dimensions

- GIVEN `minWidth` is `2` and `minHeight` is `2`
- WHEN the user resizes a widget
- THEN the widget cannot be smaller than 2 columns wide or 2 rows tall

---

### Requirement: layout change emission

CnDashboardGrid SHALL emit `@layout-change` with the updated layout array after drag or resize operations.

#### Scenario: drag emits updated positions

- GIVEN a widget at `gridX: 0, gridY: 0`
- WHEN the user drags it to `gridX: 4, gridY: 2`
- THEN `@layout-change` is emitted with the item's new position in the layout array

#### Scenario: resize emits updated dimensions

- GIVEN a widget with `gridWidth: 6, gridHeight: 2`
- WHEN the user resizes it to `gridWidth: 8, gridHeight: 4`
- THEN `@layout-change` is emitted with the item's new dimensions

---

### Requirement: layout synchronization

CnDashboardGrid SHALL synchronize the grid when the `layout` prop changes externally.

#### Scenario: adding a widget updates the grid

- GIVEN the grid has 2 items
- WHEN the `layout` prop changes to include a 3rd item
- THEN GridStack adds the new item to the grid

#### Scenario: removing a widget updates the grid

- GIVEN the grid has 3 items
- WHEN the `layout` prop changes to 2 items (one removed)
- THEN GridStack removes the missing item from the grid

---

### Requirement: scoped slot for widget content

CnDashboardGrid SHALL provide a `#widget` scoped slot for each grid item, passing the layout item as slot props.

#### Scenario: widget slot receives item data

- GIVEN a layout item `{ id: 1, widgetId: 'kpis', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 2 }`
- WHEN the grid renders the item
- THEN the `#widget` scoped slot receives `{ item }` where `item` is that layout object

---

### Current Implementation Status

**Fully implemented** in `src/components/CnDashboardGrid/CnDashboardGrid.vue` (225 lines).

**Grid initialization (implemented):**
- Uses `GridStack.init()` on mount with configurable `column`, `cellHeight`, `margin`, `float: true`, `animate: true`
- Imports `gridstack` and its CSS (`gridstack/dist/gridstack.min.css`)
- Renders layout items via `v-for` with GridStack `gs-*` attributes (`gs-id`, `gs-x`, `gs-y`, `gs-w`, `gs-h`, `gs-min-w`, `gs-min-h`)

**Drag and resize (implemented):**
- `editable` prop controls `disableDrag` and `disableResize` on init
- Watcher on `editable` calls `this.grid.enable()` / `this.grid.disable()` dynamically
- `minWidth` and `minHeight` props set minimum dimensions via `gs-min-w` and `gs-min-h` attributes

**Layout change emission (implemented):**
- GridStack `change` event handler (`handleGridChange`) maps grid positions back to the layout array format
- Emits `@layout-change` with updated positions (`gridX`, `gridY`, `gridWidth`, `gridHeight`)

**Layout synchronization (implemented):**
- Deep watcher on `layout` prop calls `syncGridItems(newLayout)`
- Adds new items by finding unmatched DOM elements and calling `grid.makeWidget(el)` via `$nextTick`
- Removes stale items by finding grid nodes not in the new layout and calling `grid.removeWidget(el, false)`

**Scoped slot (implemented):**
- `#widget` scoped slot passes `{ item }` for each layout item
- Default slot content is empty (parent provides rendering)

**Props:**
| Prop | Type | Default | Implemented |
|------|------|---------|-------------|
| `layout` | Array | required | Yes |
| `editable` | Boolean | `false` | Yes |
| `columns` | Number | `12` | Yes |
| `cellHeight` | Number | `80` | Yes |
| `margin` | Number | `12` | Yes |
| `minWidth` | Number | `2` | Yes |
| `minHeight` | Number | `2` | Yes |

**Emits:** `layout-change`

**CSS:** Uses `cn-dashboard-grid` prefix, Nextcloud CSS variables (`var(--color-main-background)`, `var(--color-primary-element-light)`, `var(--color-primary-element)`), scoped styles with `:deep()` for GridStack overrides.

**Not yet implemented:** All spec requirements are implemented.

### Standards & References

- **GridStack.js** — Third-party grid layout library; imported as `gridstack` npm package
- **Vue 2 Options API** — Component uses `export default { name, props, data, watch, mounted, beforeDestroy, methods }`
- **Nextcloud CSS variables** — Used for background, placeholder borders, and border-radius
- **WCAG AA** — Drag-and-drop interaction inherits GridStack's accessibility model; no additional ARIA roles added by this component

### Specificity Assessment

- **Specific enough?** Yes, all requirements map directly to implemented behavior.
- **Missing/ambiguous:**
  - No requirement for `float: true` behavior (GridStack's free-form placement vs. auto-pack) — the implementation uses float mode
  - No requirement for `animate: true` — the implementation enables animation
  - No requirement for cleanup on `beforeDestroy` — the implementation calls `this.grid.destroy(false)`
  - No requirement for the `margin` prop — it exists and is configurable but not specified
- **Open questions:**
  - Should the grid support auto-packing (non-float) mode as an option?
  - Should mobile/responsive breakpoints be specified for smaller screens?
