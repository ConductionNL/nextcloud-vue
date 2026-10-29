# cell-renderer Delta

## ADDED Requirements

### Requirement: A switch cell can draw a checkbox whose state a formatter answers

A `switch` cell SHALL draw a checkbox when `widgetProps.type` is `checkbox`, and without a `checked` function SHALL take
its state from its formatter when the formatter answers true or false.

#### Scenario: DqZaaktypeVelden In de lijst

- **GIVEN** a switch cell with `type: "checkbox"` and a formatter that answers whether the field is in the case list
- **WHEN** the formatter answers true for Welstandsgebied
- **THEN** the cell draws a ticked checkbox
