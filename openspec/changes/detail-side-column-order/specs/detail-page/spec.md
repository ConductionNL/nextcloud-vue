# detail-page Delta

## ADDED Requirements

### Requirement: A detail page can keep its side column in the declared order

In the board look a detail page SHALL put a notice first and the History card last in its side column, unless
`sideColumnOrder` is `declared`; then it SHALL keep the order of `sideColumn`.

#### Scenario: History on top

- **GIVEN** a board-look detail page with `sideColumn: ["history", "form", "preview"]` and `sideColumnOrder: "declared"`
- **THEN** the side column reads History, then the form, then the preview

#### Scenario: Default

- **GIVEN** the same page without `sideColumnOrder`
- **THEN** the History card is last

### Requirement: A timeline widget can show a few changes

A timeline widget SHALL show only the first `limit` events of its order when `content.limit` is a positive whole number,
and SHALL leave audit-trail reads out of its events.

#### Scenario: A short History card

- **GIVEN** a timeline with `auditTrail: true`, `order: "desc"` and `limit: 3`, over a record read many times and changed four times
- **THEN** it lists the three newest changes and no reads
