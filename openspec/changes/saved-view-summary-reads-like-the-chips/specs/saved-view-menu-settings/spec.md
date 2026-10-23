# saved-view-menu-settings Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [saved-view-summary-reads-like-the-chips](../../)

## Purpose

The line that says what a saved view shows reads in the page's words.

## ADDED Requirements

### Requirement: A view summary reads like the Active line

The summary of a saved view (menu settings row, side panel subline) SHALL name each filter and value by the page's
`filterLabels` entry before the schema, SHALL leave out a filter whose `filterLabels` entry says `hidden: true`, and
SHALL ask for a page schema again when an earlier read failed.

#### Scenario: Woo-verzoeken in "Weergaven in mijn menu"

- **GIVEN** a view with `caseType`, `statusHiddenInLists: false` and `isDraft: false`, and a page whose `filterLabels` hide the last two
- **THEN** the row reads "Zaaktype Woo-verzoek · 19 zaken", without the hidden filters or a uuid
