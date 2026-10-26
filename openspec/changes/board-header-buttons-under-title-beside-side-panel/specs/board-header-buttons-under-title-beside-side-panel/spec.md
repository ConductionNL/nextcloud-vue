# board-header-buttons-under-title-beside-side-panel Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-header-buttons-under-title-beside-side-panel](../../)

## ADDED Requirements

### Requirement: The header buttons sit under the title while the side panel is open

While an index page's side panel is open, the board look SHALL draw the header buttons on the row under the title, with
the breadcrumb and the count line after them. With the panel closed the buttons SHALL stay at the end of the title row.

#### Scenario: DqZakenSorteren

- GIVEN the Cases cards with the side panel open
- THEN the title reads at 96, Downloaden / Acties / buildiq / Nieuwe zaak at 142, the count line at 197
