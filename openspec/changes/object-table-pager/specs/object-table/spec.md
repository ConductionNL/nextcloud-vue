# object-table Delta: object-table-pager

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [object-table-pager](../../)

## Purpose

Page an object table's rows as the boards draw it.

## ADDED Requirements

### Requirement: An object table can page its rows

With `pageSize` above 0, CnWidgetObjectTable and CnDataTable SHALL show one page of the rows they hold and, when there is more than one page, CnPagination's board variant under them: the rows on the page of the total, the page buttons, Previous after the first page and Next before the last. A page past the last after the rows shrink SHALL fall back to the last page. Without `pageSize` the table SHALL render as before.

#### Scenario: Objecttypen

- **GIVEN** an object table with 7 rows and `pageSize: 4`
- **WHEN** it renders
- **THEN** it shows 4 rows and the pager reads "4 of 7", and after Next it shows 3 rows and "3 of 7"
