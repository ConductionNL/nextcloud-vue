## ADDED Requirements

### Requirement: An index header action can show only for some readers

An index page SHALL draw a header action that declares `visibleWhen` only after its condition has been evaluated and
holds, and SHALL keep it out when the condition does not hold or cannot be evaluated. A header action without
`visibleWhen` SHALL be drawn as before.

#### Scenario: Find duplicates for a reader who may
- **GIVEN** a header action with `visibleWhen: { endpoint: "/apps/stackiq/api/me", field: "mayFindDuplicates", op: "eq", value: true }`
- **WHEN** `/api/me` answers `mayFindDuplicates: false`
- **THEN** the action is not in the menu
