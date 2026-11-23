## ADDED Requirements

### Requirement: A stack can follow the order of a list on the record

A tab that holds several widgets (`widgetIds`) and names `orderFrom` SHALL draw the widgets that the list at that path
names in the list's order, in the places the listed widgets hold, and SHALL keep every other widget in its own place.
Without a list at the path, or with an empty one, the authored order SHALL stand.

#### Scenario: a case type orders its Overview cards
- **GIVEN** an Overview tab with `widgetIds: ["case-summary", "case-request", "case-terms"]` and `orderFrom: "@context.caseType.overviewCards"`
- **AND** the case type lists `["case-terms", "case-request"]`
- **THEN** the tab draws case-summary, case-terms, case-request
