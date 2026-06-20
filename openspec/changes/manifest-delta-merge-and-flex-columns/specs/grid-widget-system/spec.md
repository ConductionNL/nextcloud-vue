## MODIFIED Requirements

### Requirement: Grid layout mixin provides shared 12-column CSS grid

The `gridLayout` mixin SHALL provide a `sortedLayout` computed property, a `widgetGridStyle(item)` method, and the `.cn-grid-layout` CSS class. Both `CnDashboardPage` and `CnDetailPage` MUST use this mixin for grid rendering. The column count SHALL default to 12 but SHALL be overridable: when a resolved column count is supplied, `widgetGridStyle` MUST compute spans against that count instead of a hard-coded 12.

> @e2e exclude unit-tested via jest (utils/validator/loader specs — no browser surface)

#### Scenario: Layout items are sorted and positioned
- GIVEN a layout array with items at various gridX/gridY positions
- WHEN the grid renders
- THEN items are sorted by gridY (ascending) then gridX (ascending)
- AND each item's CSS `grid-column` is set to `(gridX + 1) / (gridX + gridWidth + 1)`

#### Scenario: Responsive breakpoints
- GIVEN a grid layout at viewport width < 600px
- WHEN the grid renders
- THEN all items span the full width (single column)

#### Scenario: Non-default column count
- GIVEN a resolved column count of 8 supplied to the grid
- WHEN the grid renders
- THEN spans are computed against 8 columns, not 12

## ADDED Requirements

### Requirement: CnWidgetGrid resolves per-slot columns in three layers

`CnWidgetGrid` SHALL resolve its column count in this order: (1) an explicit `columns` prop (Number) when not `null`; (2) `page.config.slotColumns[slotName]` when provided by the parent renderer; (3) the existing `SLOT_COLUMNS` / `getGridColumns(slotName)` default. The `columns` prop SHALL default to `null` and `slotColumns` SHALL be optional, so absent both, the current fixed behaviour (`body`=12, `sidebar`=1) is preserved exactly.

> @e2e exclude unit-tested via jest (utils/validator/loader specs — no browser surface)

#### Scenario: Default behaviour is unchanged
- **WHEN** `CnWidgetGrid` renders a `body` slot with no `columns` prop and no `slotColumns`
- **THEN** it SHALL use 12 columns

#### Scenario: Manifest slotColumns override
- **WHEN** a page declares `config.slotColumns: { "body": 8 }` and the renderer passes it down
- **THEN** the `body` slot grid SHALL use 8 columns

#### Scenario: Prop overrides manifest and default
- **WHEN** `CnWidgetGrid` receives `columns="6"` and a `slotColumns` of 8 for the same slot
- **THEN** it SHALL use 6 columns

### Requirement: Manifest validation enforces the resolved column bound

`validateManifest` SHALL enforce `gridX + gridWidth ≤ resolvedColumns` for each widget, where `resolvedColumns` is derived from the same `slotColumns`/default resolution the renderer uses, instead of a hard-coded 12. A widget that fits the page's resolved columns SHALL pass; one that exceeds them SHALL fail with a message naming the widget, its slot, and the resolved column count.

> @e2e exclude unit-tested via jest (utils/validator/loader specs — no browser surface)

#### Scenario: Widget fits a widened slot
- **WHEN** a page sets `slotColumns: { "body": 16 }` and a body widget has `gridX: 0, gridWidth: 14`
- **THEN** validation SHALL pass

#### Scenario: Widget exceeds the resolved columns
- **WHEN** a body slot resolves to 8 columns and a widget has `gridX: 4, gridWidth: 6`
- **THEN** validation SHALL fail with an error naming the widget and the bound 8
