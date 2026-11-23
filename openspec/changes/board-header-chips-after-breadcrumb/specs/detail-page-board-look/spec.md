# board-header-chips-after-breadcrumb Delta: detail-page-board-look

## ADDED Requirements

### Requirement: Board header chips follow the breadcrumb

Under the board look, CnDetailPage SHALL render the `headerFields` chips on row
2 directly after the breadcrumb, followed by the middle dot and the meta line.
The dot SHALL show only when a meta line follows a breadcrumb or chips. The
chips list SHALL take no margin of its own on that row.

#### Scenario: The slug pill sits between the breadcrumb and the count

- **GIVEN** a board detail page with a breadcrumb, `headerFields: [{ key: "slug", format: "pill" }]` and a meta line
- **WHEN** the header renders
- **THEN** row 2 reads breadcrumb, chips, dot, meta in that order

#### Scenario: Chips without a meta line draw no dot

- **GIVEN** a board detail page with chips and no meta line
- **WHEN** the header renders
- **THEN** row 2 has the chips and no dot
