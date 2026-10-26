# index-page Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [index-toolbar-start-and-active-only-quick-filters](../../)

## ADDED Requirements

### Requirement: A page can put its own controls at the start of the toolbar row

CnIndexPage SHALL offer a `toolbar-start` slot whose content is drawn at the start of the toolbar row, before the
quick-filter chips, also when the page has no quick filters.

#### Scenario: DqAanMijToegewezen

- GIVEN the Assigned to me view fills `toolbar-start` with the team's name chips
- THEN the toolbar row reads "Pieter Jansen (u) 7, Anouk Bakker 9, ..." and then Filter and the view switch

### Requirement: Quick filters can show only on the Active line

With `quickFilterPlacement` (or the current view's `quickFilterPlacementByView` entry) set to `active`, CnIndexPage
SHALL draw no quick-filter tabs, neither in the toolbar nor on a row of their own. A chosen tab with an `activeLabel`
SHALL still show on the Active line and SHALL be removable there.

#### Scenario: DqAanMijToegewezen

- GIVEN the view's one quick filter "Including work you cover" is the default and the placement is `active`
- THEN no tab is drawn and the Active line reads "Actief: [Inclusief werk waarvoor u waarneemt ×] Alles wissen"
