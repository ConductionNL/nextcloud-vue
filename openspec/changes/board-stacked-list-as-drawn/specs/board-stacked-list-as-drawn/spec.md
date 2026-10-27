# board-stacked-list-as-drawn Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-stacked-list-as-drawn](../../)

## ADDED Requirements

### Requirement: A board stacked list is drawn as the board

In the board look, a stacked `CnRecordListWidget` on a dashboard SHALL set its due line at normal leading, draw its footer
link as a block 10px under the last row, and pad 20px under the list when it has a footer link.

#### Scenario: DqDagAfsluiten "Morgen eerst"

- **THEN** the card is 195px and "Naar Mijn werk" starts 10px under the last row
