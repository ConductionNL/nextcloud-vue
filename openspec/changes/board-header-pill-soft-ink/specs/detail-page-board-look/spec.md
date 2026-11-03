# board-header-pill-soft-ink Delta: detail-page-board-look

## ADDED Requirements

### Requirement: A board header pill takes the soft ink

Under the board look, a header chip with `format: "pill"` in the detail
header's second row SHALL draw its text in the board's soft text colour.

#### Scenario: The organisation slug

- **GIVEN** the DqTenant header with the slug chip "waterland"
- **WHEN** it renders under the board look
- **THEN** the pill's text takes `--cn-board-text-soft`
