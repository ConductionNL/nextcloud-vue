## ADDED Requirements

### Requirement: a files browser entry can apply only when a condition holds

A declared column, row action or row button with a `when` key MUST be used only when `when` is exactly `true`; an entry without `when` is used as before.

#### Scenario: DqDocumentenBeheer
- GIVEN a verdict column and a "Beoordelen" row button with `when` false (the case type reviews nothing)
- THEN neither is drawn

### Requirement: a modal action can carry fields of the clicked file's row data

An `open-modal` action with `rowProps` MUST add, per entry, the clicked file's row-data field to the modal's props under the given name.

#### Scenario: Beoordelen
- GIVEN `rowProps: { "documentId": "id" }` and a file whose row data has id "doc-1"
- THEN the modal opens with `documentId: "doc-1"`
