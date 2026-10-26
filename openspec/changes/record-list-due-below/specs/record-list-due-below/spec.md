# record-list-due-below Delta

**Status**: proposed
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: A row's due text can sit under its title

A `rows` record list with `duePlacement: "below"` SHALL draw the row's due text as a line in the row's main column,
after the title and meta, at 13px and in the due tone, and SHALL not draw it at the end of the row.

#### Scenario: DqDagAfsluiten Morgen eerst

- **GIVEN** a task due three days ago and `due: { field: "dueAt", overdueLabel: ... }`, `duePlacement: "below"`
- **THEN** "3 dagen te laat" is drawn under "Zienswijze derde belanghebbende vragen", in the error ink
