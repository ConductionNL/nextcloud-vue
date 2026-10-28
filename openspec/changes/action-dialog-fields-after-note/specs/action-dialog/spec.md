# action-dialog Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [action-dialog-fields-after-note](../../)

## ADDED Requirements

### Requirement: The action dialog can draw its fields after the note

With `fieldsAfterNote: true` the action dialog SHALL render its fields after the reason and the note, in document
order. Without the key it SHALL render the fields, then the reason, then the note.

#### Scenario: DqArchiveren

- **GIVEN** the archive dialog config sets `fieldsAfterNote: true` and has a checkbox field
- **WHEN** the dialog opens
- **THEN** the reason, the "Read only afterwards" note and then the checkbox follow the checklist
