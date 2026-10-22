# detail-list-navigation-wired Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [detail-list-navigation-wired](../../)

## Purpose

A manifest detail page opened from a list offers next and previous within that list.

## ADDED Requirements

### Requirement: A manifest detail page offers next and previous within its list

CnPageRenderer SHALL, on a detail page whose address names the index page it was opened from (`_from`), fetch that
list from OpenRegister with the address's search, sort and filters, and pass CnDetailPage `listNavigation`
(`{ available, isFirst, isLast, position, total }`), `previousTo` and `nextTo` when the record sits in the list. It SHALL
pass none for a record reached without list context, for a list with a source of its own, or when the list cannot be read.

#### Scenario: Next within a filtered queue

- **GIVEN** the cases index filtered on status open, and the handler opens the second case
- **THEN** the case page offers previous (the first case) and next (the third), both keeping the filter
