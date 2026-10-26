# data-table Delta: board-index-header-wraps

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-index-header-wraps](../../)

## ADDED Requirements

### Requirement: A board index header wraps a label that does not fit

In the board look, an index table header whose label does not fit its column SHALL wrap the label over lines, with
its sort chevron and filter button beside it, and SHALL NOT cut it with an ellipsis. A label that fits SHALL stay on
one line.

#### Scenario: DqOrganisaties

- **GIVEN** the organisations list with its seven columns at 1440px
- **THEN** the headers read "KvK-nummer", "Lopende zaken", "Open tickets" and "Laatste contact" in full, over two lines
