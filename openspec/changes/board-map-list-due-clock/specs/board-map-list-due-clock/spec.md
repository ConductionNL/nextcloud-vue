# board-map-list-due-clock Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-map-list-due-clock](../../)

## ADDED Requirements

### Requirement: A board map list row's date carries a clock

In the board look the date of a map list row SHALL be drawn with a 14px clock icon 4px before it, at 13px and weight 600
in the soft text colour. The Nextcloud look SHALL be unchanged.

#### Scenario: DqZakenKaart

- GIVEN the cases index in the board look, map view
- THEN the row "Verlichting fietspad Lindelaan" ends with a clock and "1 nov"
