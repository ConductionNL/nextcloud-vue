## MODIFIED Requirements

### Requirement: Table and Card View Toggle

CnIndexPage SHALL support three view modes (`table`, `cards`, and the opt-in `map`)
controlled by the `viewMode` prop, with a toggle rendered inside CnActionsBar when
`showViewToggle` is true. The `viewMode` validator MUST accept `'table' | 'cards' | 'map'`
and MUST default to `'table'`. The `map` segment is offered only when the page opts in
(see the `index-page-map-view` capability); when a page does not opt in, the toggle shows
only the `table` and `cards` segments and behaves exactly as before. New optional props
`mapLabel` and `mapIcon` (both defaulting to empty, falling back to a built-in label/icon)
customise the map segment. Switching views MUST preserve selection state.

#### Scenario: Default table view

- **GIVEN** `viewMode='table'` (default)
- **WHEN** CnIndexPage renders
- **THEN** CnDataTable MUST render with rows from `objects` prop
- **AND** CnCardGrid MUST NOT render
- **AND** CnMapWidget MUST NOT render

#### Scenario: Card view

- **GIVEN** `viewMode='cards'`
- **WHEN** CnIndexPage renders
- **THEN** CnCardGrid MUST render with objects
- **AND** CnDataTable MUST NOT render
- **AND** each card MUST be overridable via `#card="{ object, selected }"` scoped slot

#### Scenario: Toggling view mode via UI

- **GIVEN** `showViewToggle=true` (default)
- **WHEN** the user clicks a view toggle segment in CnActionsBar
- **THEN** `currentViewMode` MUST switch to the selected mode
- **AND** `@view-mode-change(mode)` MUST emit with the new mode string (`'table'`, `'cards'`, or `'map'`)

#### Scenario: Map segment appears only when opted in

- **GIVEN** `showViewToggle=true` and the page has NOT opted into map view
- **WHEN** CnIndexPage renders the toggle
- **THEN** only the `table` and `cards` segments MUST appear
- **AND** the toggle MUST render and behave identically to the pre-map two-segment control

#### Scenario: Selection preserved across view switch

- **GIVEN** rows with IDs `['1', '3']` are selected in table view
- **WHEN** the user switches to card view or map view
- **THEN** `internalSelectedIds` MUST still contain `['1', '3']`
- **AND** the corresponding cards MUST appear selected when switched back

#### Scenario: View toggle hidden

- **GIVEN** `showViewToggle=false`
- **WHEN** CnIndexPage renders
- **THEN** no view toggle MUST appear in CnActionsBar

**Cross-reference:** REQ-DD-001 (CnDataTable), REQ-DD-002 (CnCardGrid) in `data-display/spec.md`; `index-page-map-view/spec.md` (map mode)
