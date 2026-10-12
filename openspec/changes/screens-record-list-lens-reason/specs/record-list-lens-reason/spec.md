# record-list-lens-reason Delta: screens-record-list-lens-reason

## ADDED Requirements

### Requirement: A record list says why a lens is empty

When the response of a record list carries `@self.lenses.<lens>.available: false` with a reason
and the list has no rows, `CnRecordListWidget` SHALL show the explanation for that lens and reason
in place of `emptyText`: the text of `content.lensReasonTexts` (`<lens>.<reason>`, then `<reason>`,
through the host's translate), else the library's own text. A response without a report, a lens
that is available, a reason without text and a list with rows SHALL keep the current behaviour.

#### Scenario: Recent without an audit trail

- **GIVEN** a list with `filter: { _recent: true }` and `emptyText: "No cases"`
- **WHEN** the response is empty with `@self.lenses.recent = { available: false, reason: "audit-trail-disabled" }`
- **THEN** the list reads "This server does not keep track of what you open."
- @e2e e2e/record-list-lens-reason.e2e.js

#### Scenario: The app's own wording

- **GIVEN** `lensReasonTexts: { "recent.audit-trail-disabled": "Recent cases need the audit trail." }`
- **WHEN** the same response arrives
- **THEN** the list reads "Recent cases need the audit trail."
- @e2e e2e/record-list-lens-reason.e2e.js
