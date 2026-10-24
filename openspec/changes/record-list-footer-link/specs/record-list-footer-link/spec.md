# record-list-footer-link Delta

**Status**: proposed
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: A record list can end with a text link

A record list with `footerLink` SHALL draw it as a text link under its rows, resolved as `headerLink` is (`{total}`
filled, tokens in `params` and `query` resolved), and SHALL not draw it while the list has no rows or failed to load.

#### Scenario: DqDagAfsluiten Morgen eerst

- **GIVEN** `footerLink: { label: "To My work", route: "MyWorkHome" }`
- **THEN** "Naar Mijn werk" is a link under the items
