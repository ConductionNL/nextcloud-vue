# index-page Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [index-notice-below-card](../../)

## Purpose

A list page's notice sits where its board draws it.

## ADDED Requirements

### Requirement: An index page notice can sit under the list card

With `notice.placement: 'page'` CnIndexPage SHALL draw the notice once, after the list body and outside the list card.
Without a placement it SHALL draw the notice inside the list, under the rows, as before.

#### Scenario: DqContracten

- **GIVEN** the Contracts page with `notice: { text: "Renewing and terminating are decisions ...", placement: "page" }`
- **THEN** the notice is drawn under the table card, not inside it
