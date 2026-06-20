## ADDED Requirements

### Requirement: CnWidgetGrid supports an edit-aware draggable body mode

`CnWidgetGrid` SHALL accept an `editable` boolean prop (default `false`). When `editable` is `false` it MUST render the existing CSS grid unchanged, preserving all current behaviour. When `editable` is `true` for the `body` slot, it SHALL mount a GridStack-backed draggable/resizable grid (the same engine used by `CnDashboardGrid`) configured with a column count equal to `resolveSlotColumns(slotName, cnSlotColumns, columns)`, and exactly one layout engine (CSS grid OR GridStack) SHALL be live at a time. The CSS-grid and GridStack render paths MUST be mutually exclusive (`v-if`/`v-else`) so the two layout systems never run simultaneously.

> @e2e exclude grid edit mode — covered by jest mount tests; drag e2e lands in a consuming app's suite

#### Scenario: Default render path is unchanged when not editable
- **WHEN** `CnWidgetGrid` is rendered with `editable` defaulting to `false`
- **THEN** it SHALL render the existing CSS grid
- **AND** no GridStack instance SHALL be created

#### Scenario: Editable body slot mounts GridStack with resolved columns
- **WHEN** `CnWidgetGrid` renders the `body` slot with `editable` set to `true`
- **THEN** it SHALL mount a GridStack instance with column count equal to `resolveSlotColumns(slotName, cnSlotColumns, columns)`
- **AND** the CSS-grid render path SHALL NOT also be present

### Requirement: Drag and resize write geometry back to the working widget entries

When `editable` is `true`, dragging or resizing a widget SHALL write the new `gridX`, `gridY`, `gridWidth`, and `gridHeight` values back into the corresponding widget entry of the editor's working copy, matching the entry by `widget.id` when present and falling back to array index for id-less entries. The written geometry MUST respect the resolved column count so a widget cannot be positioned beyond `resolveSlotColumns(...)`.

> @e2e exclude grid geometry write-back — unit-tested via jest with a GridStack change event

#### Scenario: Resizing a widget updates the working entry by id
- **WHEN** a widget with `id` `"revenue-kpi"` is resized in editable mode
- **THEN** the matching `working` body widget entry's `gridWidth`/`gridHeight` SHALL be updated to the new size
- **AND** the change SHALL be matched by `widget.id`, not by array position

#### Scenario: Geometry stays within the resolved column bound
- **WHEN** a widget is dragged in a `body` slot whose resolved column count is `8`
- **THEN** the written `gridX + gridWidth` SHALL NOT exceed `8`
