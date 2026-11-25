## ADDED Requirements

### Requirement: The labels of a chart are read in one request

A chart whose aggregate declares `labelResolve` SHALL read the referenced objects of its keys in one list request filtered by `_ids`, and SHALL read a key on its own only when that request did not return it.

#### Scenario: A status chart reads its status types once
- **GIVEN** a cases-by-status chart with three status keys, none in the object store
- **WHEN** the chart resolves its labels
- **THEN** it SHALL send one request for the status types with `_ids` naming the three keys
- **AND** it SHALL send no per-object request

#### Scenario: A key the list did not return is still labelled right
- **GIVEN** a list answer that lacks one of the keys, or that ignored `_ids`
- **WHEN** the chart resolves its labels
- **THEN** the missing key SHALL be read on its own, and a key that resolves to nothing SHALL read "Unknown"

@e2e exclude Asserted in tests/components/CnChartWidgetLabelBatch.spec.js; the request count on a live page is measured by the consuming app's performance spec.
