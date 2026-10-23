## ADDED Requirements

### Requirement: A queued change carries a label in words

The offline queue SHALL keep an optional `label` on each operation, empty when none is given. The queue list SHALL name an operation by its label and SHALL fall back to its operation type, schema and target when the label is empty.

#### Scenario: a labelled checklist in the queue
- **GIVEN** a checklist for "Molenweg 4" queued from the field-inspection leaf
- **WHEN** the queue list renders
- **THEN** the row SHALL read "Molenweg 4, checklist"

#### Scenario: an operation without a label
- **GIVEN** an operation queued without a label
- **WHEN** the queue list renders
- **THEN** the row SHALL read its operation type, schema and target
