## ADDED Requirements

### Requirement: a column aggregate can be read from the host app's endpoint

A column with `aggregate.endpoint` and `aggregate.key` MUST read its values in one request for the visible rows, sending each row's `key` field as `keys`, and MUST show 0 for a row the answer does not name. The column MUST NOT be drawn while `aggregate.requiresApp` is not installed, and MUST NOT be drawn after the endpoint answers `available: false`.

#### Scenario: open tickets per organisation
- GIVEN rows with master entities m1 and m2 and a row without one
- WHEN the endpoint answers `{ available: true, values: { m1: 1 } }`
- THEN the cells read 1, the zero label and the zero label, after one request

#### Scenario: pipelinq is not installed
- GIVEN `requiresApp: "pipelinq"` and no pipelinq
- THEN the column is not drawn and nothing is asked
