# index-page Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [index-page-tabs-notice](../../)

## Purpose

A list says which sibling lists exist and how it works, from configuration.

## ADDED Requirements

### Requirement: An index page can link its sibling pages as tabs

With `pageTabs`, CnIndexPage SHALL draw a strip of links above the toolbar, one per tab, marking the current route's tab
and showing the count of a tab's `countFrom` list once known. A click SHALL follow the tab on the app's router.

#### Scenario: Privacy

- **GIVEN** tabs "AVG-verzoeken" and "Datalekken", counting 12 and 2 cases
- **THEN** the strip reads "AVG-verzoeken 12 | Datalekken 2" with the current page's tab marked

### Requirement: An index page can show a notice under its list

With `notice`, CnIndexPage SHALL draw its translated text as a note card under the list in its `variant` (info by
default). Without text it SHALL draw nothing.

#### Scenario: The privacy band

- **GIVEN** `notice: { text: "Een AVG-verzoek is een zaak met een behandelaar ...", variant: "info" }`
- **THEN** the band shows under the table
