# record-widgets Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [status-explainer-board](../../)

## ADDED Requirements

### Requirement: The status card says where the record stands as the board draws it

A `status-explainer` with `withheld: false` SHALL leave the withheld moves out. In the board look the explainer SHALL
draw no box, its explanation SHALL be a bold line in the main ink and its dwell a muted line under it.

#### Scenario: The case Status card

- **GIVEN** a case in "Stukken worden verzameld en beoordeeld" for 3 working days, with two withheld moves
- **WHEN** the Status card shows with `withheld: false`
- **THEN** it reads the status line in bold and "3 werkdagen in deze status" under it, with no grey box and no moves
