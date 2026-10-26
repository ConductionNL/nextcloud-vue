# board-side-panel-header-rhythm Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-side-panel-header-rhythm](../../)

## ADDED Requirements

### Requirement: The side panel header and first field sit as the boards draw them

In the board look the index side panel SHALL draw the line under its title at 14px, 2px under the title, with the tab row 14px under that line and the first field 20px under the tab row, also under a theme that sets paragraphs with `!important`.

#### Scenario: DqZakenSorteren

- GIVEN the Cases side panel open on the Zoeken tab
- THEN the title is at 20, the line under it at 46, the tabs at 77 and the search field at 137 from the panel top
