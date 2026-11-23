# card-empty-footer-cell-dash Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [card-empty-footer-cell-dash](../../)

## ADDED Requirements

### Requirement: An empty footer cell reads as a dash

When a record card's layout names a `footerCell` and the field is empty, the card SHALL draw an em dash in its place before the footer date. A footer that would hold only the empty cell SHALL stay out.

#### Scenario: DqZakenSorteren

- GIVEN a case without a handler, due 31 okt
- THEN its card footer reads "—" and "31 okt"
