# record-list-cards Delta: record-list-cards

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [record-list-cards](../../)

## Purpose

A record list can draw its rows as separate cards, as board ShBank draws the bank accounts.

## ADDED Requirements

### Requirement: A record list can draw its rows as cards

A record list with `presentation: "cards"` SHALL draw each row as a framed card (1px border, radius 12px, padding
16px 18px) in a grid of cards at least 240px wide and 16px apart. A card SHALL show the `icon` (only when the list
declares `icon`) and the `title`, the `pill` and `badges` beside them, the `meta` line under them, and `trailing` as a
24px bold figure. A card SHALL be a link when the list has a `rowRoute`. A list without `presentation`, or with a value
it does not know, SHALL draw rows as before. Under the board look the cards SHALL keep a 24px side inset inside a titled
dashboard card and SHALL stand flush in a borderless cell.

#### Scenario: Bank accounts as cards

- **GIVEN** a record list with `presentation` `cards`, `icon` `Bank`, `title` `{accountName}`, `meta` `{iban}` and `trailing` `EUR {ledgerBalance}`
- **WHEN** the endpoint returns four accounts on a dashboard 1176px wide
- **THEN** four cards stand side by side, 16px apart, each with the bank icon, the name, the IBAN and the balance at 24px bold

#### Scenario: Rows stay the default

- **GIVEN** a record list without `presentation`
- **WHEN** it draws
- **THEN** it draws rows, and no card
