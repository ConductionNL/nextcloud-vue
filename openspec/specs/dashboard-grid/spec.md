# CnDashboardGrid Specification

## Purpose

`CnDashboardGrid` is the core grid layout engine that wraps GridStack.js. It manages grid initialization, item positioning, drag/drop, resize, and layout synchronization. It is a low-level component used internally by `CnDashboardPage`.

---

## Requirements

### Requirement: GridStack integration and initialization

CnDashboardGrid SHALL initialize a GridStack.js instance on mount, binding it to the `.grid-stack` container element, with the configured columns, cell height, margin, and float mode.

#### Scenario: grid initializes on mount

- GIVEN the component receives a `layout` array with 3 items
- WHEN the component mounts
- THEN `GridStack.init()` is called on the `.grid-stack` element with `column`, `cellHeight`, `margin`, `float: true`, `animate: true`, and `removable: false`
- AND all 3 items are rendered at their specified grid positions using `gs-*` attributes

#### Scenario: grid is destroyed on component teardown

- GIVEN the grid has been initialized
- WHEN the component is destroyed (`beforeDestroy`)
- THEN `grid.destroy(false)` is called to clean up the GridStack instance without removing DOM elements

---

### Requirement: 12-column grid system

CnDashboardGrid SHALL use a 12-column grid by default, configurable via the `columns` prop.

#### Scenario: default 12-column layout

- GIVEN `columns` is not specified (default `12`)
- WHEN a layout item has `gridWidth: 6`
- THEN the item occupies exactly half the grid width

#### Scenario: custom column count

- GIVEN `columns` is set to `6`
- WHEN a layout item has `gridWidth: 3`
- THEN the item occupies half the grid width

#### Scenario: full-width item

- GIVEN `columns` is `12`
- WHEN a layout item has `gridWidth: 12`
- THEN the item spans the entire grid width

---

### Requirement: configurable cell height

CnDashboardGrid SHALL support a configurable cell height in pixels via the `cellHeight` prop, defaulting to `80`.

#### Scenario: default cell height

- GIVEN `cellHeight` is not specified (default `80`)
- WHEN a layout item has `gridHeight: 2`
- THEN the item renders at approximately 160px tall (plus margin)

#### Scenario: custom cell height

- GIVEN `cellHeight` is `120`
- WHEN a layout item has `gridHeight: 3`
- THEN the item renders at approximately 360px tall (plus margin)

---

### Requirement: drag-and-drop repositioning

CnDashboardGrid SHALL allow drag-and-drop repositioning of widgets when `editable` is `true`, and prevent it when `editable` is `false`.

#### Scenario: drag enabled in edit mode

- GIVEN `editable` is `true`
- WHEN the user drags a widget from `gridX: 0, gridY: 0` to `gridX: 4, gridY: 2`
- THEN the widget moves to the new grid position
- AND `@layout-change` is emitted with the updated position

#### Scenario: drag disabled in view mode

- GIVEN `editable` is `false`
- WHEN the user attempts to drag a widget
- THEN the widget does not move
- AND no `@layout-change` event is emitted

#### Scenario: edit mode toggled dynamically

- GIVEN the grid is initialized with `editable: false`
- WHEN `editable` changes to `true`
- THEN `grid.enable()` is called and drag/resize become active
- AND when `editable` changes back to `false`, `grid.disable()` is called

---

### Requirement: resize with handles

CnDashboardGrid SHALL allow widget resizing via GridStack resize handles when `editable` is `true`.

#### Scenario: resize a widget

- GIVEN `editable` is `true` and a widget has `gridWidth: 6, gridHeight: 2`
- WHEN the user drags the resize handle to expand the widget
- THEN the widget dimensions update to the new size
- AND `@layout-change` is emitted with the updated `gridWidth` and `gridHeight`

#### Scenario: resize disabled in view mode

- GIVEN `editable` is `false`
- WHEN the user attempts to resize a widget via its handle
- THEN the widget dimensions do not change

---

### Requirement: collision avoidance with float mode

CnDashboardGrid SHALL use GridStack float mode (`float: true`) to allow free-form placement of widgets without automatic packing, while still preventing widget overlap through GridStack's built-in collision detection.

#### Scenario: widgets do not overlap

- GIVEN two widgets exist on the grid
- WHEN the user drags one widget onto the position of another
- THEN GridStack prevents the overlap by repositioning or blocking the move

#### Scenario: free-form placement with gaps

- GIVEN `float: true` is configured
- WHEN the user places a widget at `gridY: 4` with nothing above it
- THEN the widget remains at `gridY: 4` and is not auto-packed to `gridY: 0`

---

### Requirement: layout serialization format

CnDashboardGrid SHALL use layout items with `gridX`, `gridY`, `gridWidth`, and `gridHeight` properties, mapping them to GridStack's `gs-x`, `gs-y`, `gs-w`, and `gs-h` attributes respectively.

#### Scenario: layout item maps to GridStack attributes

- GIVEN a layout item `{ id: 1, widgetId: 'kpis', gridX: 2, gridY: 0, gridWidth: 8, gridHeight: 3 }`
- WHEN the grid renders the item
- THEN the DOM element has attributes `gs-id="1"`, `gs-x="2"`, `gs-y="0"`, `gs-w="8"`, `gs-h="3"`

#### Scenario: GridStack positions map back to layout format

- GIVEN GridStack reports a changed item with `{ id: '1', x: 4, y: 2, w: 6, h: 4 }`
- WHEN `handleGridChange` processes the change
- THEN the emitted layout item has `{ gridX: 4, gridY: 2, gridWidth: 6, gridHeight: 4 }`
- AND all other properties of the original layout item are preserved via spread

---

### Requirement: minimum widget sizes

CnDashboardGrid SHALL enforce minimum widget dimensions via `minWidth` and `minHeight` props, defaulting to `2` grid units each.

#### Scenario: resize respects minimum width

- GIVEN `minWidth` is `2`
- WHEN the user attempts to resize a widget narrower than 2 columns
- THEN the widget width stays at 2 columns minimum

#### Scenario: resize respects minimum height

- GIVEN `minHeight` is `2`
- WHEN the user attempts to resize a widget shorter than 2 rows
- THEN the widget height stays at 2 rows minimum

#### Scenario: minimum dimensions applied via gs-min attributes

- GIVEN `minWidth` is `3` and `minHeight` is `2`
- WHEN a layout item is rendered
- THEN the DOM element has `gs-min-w="3"` and `gs-min-h="2"`

---

### Requirement: edit mode enable and disable

CnDashboardGrid SHALL control the editability of the grid via the `editable` prop, initializing GridStack with `disableDrag` and `disableResize` set to the inverse of `editable`.

#### Scenario: grid initializes as non-editable by default

- GIVEN `editable` is not specified (default `false`)
- WHEN GridStack initializes
- THEN `disableDrag: true` and `disableResize: true` are passed to `GridStack.init()`

#### Scenario: grid initializes as editable

- GIVEN `editable` is `true`
- WHEN GridStack initializes
- THEN `disableDrag: false` and `disableResize: false` are passed to `GridStack.init()`

---

### Requirement: animation on layout changes

CnDashboardGrid SHALL enable GridStack animations so that widgets animate smoothly when repositioned or resized.

#### Scenario: animation is enabled

- GIVEN the grid initializes
- WHEN `GridStack.init()` is called
- THEN the `animate: true` option is passed to the configuration

#### Scenario: widget moves with animation

- GIVEN `animate: true` is configured and `editable` is `true`
- WHEN the user drags a widget to a new position
- THEN the widget slides smoothly to its new grid cell rather than snapping instantly

---

### Requirement: layout change emission

CnDashboardGrid SHALL emit `@layout-change` with the complete updated layout array after any drag or resize operation.

#### Scenario: drag emits updated positions

- GIVEN a layout with items A and B, where A is at `gridX: 0, gridY: 0`
- WHEN the user drags item A to `gridX: 4, gridY: 2`
- THEN `@layout-change` is emitted with the full layout array containing A's new position and B unchanged

#### Scenario: resize emits updated dimensions

- GIVEN a widget with `gridWidth: 6, gridHeight: 2`
- WHEN the user resizes it to `gridWidth: 8, gridHeight: 4`
- THEN `@layout-change` is emitted with the full layout array containing the widget's new dimensions

#### Scenario: empty change is ignored

- GIVEN the GridStack `change` event fires with an empty items array
- WHEN `handleGridChange` is called with `items` being `null` or length `0`
- THEN no `@layout-change` event is emitted

---

### Requirement: layout synchronization from prop changes

CnDashboardGrid SHALL synchronize the grid when the `layout` prop changes externally, adding new items and removing stale items.

#### Scenario: adding a widget updates the grid

- GIVEN the grid has 2 items
- WHEN the `layout` prop changes to include a 3rd item
- THEN on `$nextTick`, the new DOM element is found by `[gs-id]` and `grid.makeWidget(el)` is called

#### Scenario: removing a widget updates the grid

- GIVEN the grid has 3 items
- WHEN the `layout` prop changes to 2 items (one removed)
- THEN `grid.removeWidget(el, false)` is called for the removed item's element (keeping DOM intact for Vue)

#### Scenario: updating existing item positions

- GIVEN the grid has 2 items
- WHEN the `layout` prop changes with an existing item at a new position
- THEN the deep watcher triggers `syncGridItems` which reconciles the grid state

---

### Requirement: configurable grid margin

CnDashboardGrid SHALL support a configurable grid margin in pixels via the `margin` prop, defaulting to `12`.

#### Scenario: default margin applied

- GIVEN `margin` is not specified (default `12`)
- WHEN the grid initializes
- THEN GridStack is initialized with `margin: 12`

#### Scenario: custom margin

- GIVEN `margin` is `8`
- WHEN the grid initializes
- THEN GridStack is initialized with `margin: 8`, reducing spacing between widgets

---

### Requirement: scoped slot for widget content

CnDashboardGrid SHALL provide a `#widget` scoped slot for each grid item, passing the layout item as slot props.

#### Scenario: widget slot receives item data

- GIVEN a layout item `{ id: 1, widgetId: 'kpis', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 2 }`
- WHEN the grid renders the item
- THEN the `#widget` scoped slot receives `{ item }` where `item` is that layout object

#### Scenario: empty default slot

- GIVEN no `#widget` slot content is provided by the parent
- WHEN the grid renders the item
- THEN the widget area renders empty (the parent, typically `CnDashboardPage`, is responsible for content)

---

### Requirement: accessibility for grid navigation

CnDashboardGrid SHALL rely on GridStack's built-in accessibility model for drag-and-drop interactions and use Nextcloud CSS variables for visual theming to support users with custom contrast settings.

#### Scenario: placeholder is visually distinguishable

- GIVEN `editable` is `true` and the user is dragging a widget
- WHEN the drag placeholder appears
- THEN it uses `var(--color-primary-element-light)` background and `var(--color-primary-element)` dashed border for high-contrast visibility

#### Scenario: grid works with keyboard-driven users

- GIVEN a keyboard-only user interacts with the dashboard
- WHEN `editable` is `false` (default view mode)
- THEN all widget content is focusable and navigable via standard tab order without interference from the grid layout

---

## Current Implementation Status

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

## Standards & References

- **GridStack.js** — Third-party grid layout library; imported as `gridstack` npm package
- **Vue 2 Options API** — Component uses `export default { name, props, data, watch, mounted, beforeDestroy, methods }`
- **Nextcloud CSS variables** — Used for background, placeholder borders, and border-radius
- **WCAG AA** — Drag-and-drop interaction inherits GridStack's accessibility model; no additional ARIA roles added by this component
