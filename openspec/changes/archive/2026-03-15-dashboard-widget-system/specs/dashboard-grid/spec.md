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
