# board-table-fits-beside-side-panel Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-table-fits-beside-side-panel](../../)

## ADDED Requirements

### Requirement: The table fits its column beside the open side panel

In the board look, while an index page's side panel is open, its table SHALL be no wider than its column: configured column widths SHALL give way, cell text and pills SHALL wrap, a long word hyphenated before it breaks elsewhere, and headers SHALL keep their label and icons on one line. The table SHALL not scroll sideways. With the panel closed the table SHALL keep its configured widths.

#### Scenario: DqFilterBeheren

- GIVEN the Cases table with the side panel open in a 760px column
- THEN the table is 760px wide, case titles wrap and there is no horizontal scrollbar
