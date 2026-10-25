# record-notes-recorded-event Delta

**Status**: proposed
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: A recorded note tells the row's leaf

When a note-rows record list with a `rowLeaf` records a row's note, it SHALL dispatch the document event
`cn-record-notes:recorded` whose `detail` is the row's leaf props (`objectId`, `register`, `schema`, `surface`) and
`note`. A list without a `rowLeaf` SHALL dispatch none, and a failed write SHALL dispatch none.

#### Scenario: DqDagAfsluiten hours with the note

- **GIVEN** the "Advies boomdeskundige" row holds a note and 1 hour in humaniq's row leaf
- **WHEN** the note is recorded
- **THEN** the leaf hears the event for that task and books the hour
