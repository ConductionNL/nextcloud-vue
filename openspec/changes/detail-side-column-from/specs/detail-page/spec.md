## ADDED Requirements

### Requirement: A record can pick the side column and its order

A detail page MAY declare `sideColumnFrom`, a field path read like a `visibleWhen` field. When its value for the
record is a non-empty list of widget ids, the side column SHALL show those `sideColumn` entries in that order and leave
the others out; each entry SHALL still follow its own `visibleWhen`, and an id that names no entry SHALL be skipped.
When the value is anything else, the side column SHALL be `sideColumn` as declared.

#### Scenario: A case type without a list keeps the declared column
- GIVEN `sideColumnFrom: "@context.caseType.sideCards"` and a case type with no `sideCards`
- WHEN the case page renders
- THEN the side column is the declared one

#### Scenario: A case type with a list sets the column and its order
- GIVEN a case type with `sideCards: ["consent", "deadline"]`
- WHEN the case page renders
- THEN the side column shows consent, then deadline, and no other card
