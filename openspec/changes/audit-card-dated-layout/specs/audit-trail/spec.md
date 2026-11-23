# audit-trail Delta: audit-card-dated-layout

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [audit-card-dated-layout](../../)

## Purpose

A short history reads as dates beside what happened.

## ADDED Requirements

### Requirement: An audit list can put the date beside what happened

With `layout: "dated"` the audit card SHALL list its entries as a two-column list: the date in the board's short form
on the left and the action's words on the right, one line per entry. It SHALL NOT add who did it unless the action's
label names them with `{actor}`. Without `layout` the rows SHALL stay as they were.

#### Scenario: Board PqJourney

- **GIVEN** a journey activated by Pieter Jansen on 2 October and created on 30 September
- **WHEN** the side card lists them with `layout: "dated"` and the labels "Activated by {actor}" and "Created"
- **THEN** it reads "2 okt  Activated by Pieter Jansen" and "30 sep  Created"
