# dashboard-layout-when Delta

## ADDED Requirements

### Requirement: A dashboard can arrange its cards by the page's workspace

A dashboard MAY declare `layoutWhen`, a list of `{ when, layout }` with `when` a workspace condition. While an entry's
condition holds, the dashboard SHALL draw the first such entry's layout; when none holds it SHALL draw its own layout.
An entry without a workspace condition or without a layout SHALL be ignored.

#### Scenario: Board PqWerkplekKlant in a call

- **WHEN** `@workspace.callActive` turns true on a page whose `layoutWhen` holds a three-column layout for it
- **THEN** the page draws that layout
- **AND** when the call ends the page draws its own layout again
