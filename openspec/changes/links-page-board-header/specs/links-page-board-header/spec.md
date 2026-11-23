# links-page-board-header Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [links-page-board-header](../../)

## ADDED Requirements

### Requirement: A board links page draws the page header

In the board look, `CnLinkCardsPage` SHALL render its title as the page's `h1` with the buildiq edit button on the title's
row and its description under it, and SHALL take the board content frame. The Nextcloud look SHALL keep its `h2` header.

#### Scenario: PqModules

- **GIVEN** pipelinq's Modules page in the board look
- **THEN** "Modules en meer" is a 28px h1 with the buildiq square at the end of its row
