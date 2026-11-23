# record-notes-label-above Delta

**Status**: proposed
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: A note row's field is labelled above it

A note-rows record list SHALL draw each row's note field with its label (`noteAction.fieldLabel`) above the field,
tied to it with `for`/`id`, and SHALL NOT draw a floating label inside the field.

#### Scenario: DqDagAfsluiten Nog open van vandaag

- **THEN** "Wat er gebeurde" stands 6px above the note field, level with "Uren" above the hours field
