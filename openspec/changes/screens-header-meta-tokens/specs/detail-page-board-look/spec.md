# detail-page-board-look Delta: screens-header-meta-tokens

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-header-meta-tokens](../../)

## Purpose

A detail page's header meta line that reads like the boards draw it.

## ADDED Requirements

### Requirement: The header meta line formats users, long dates and enum labels

The header meta line SHALL read an enum field as its translated `x-enum-labels` label, SHALL format `{path|user}` as
the user's display name (looked up once, empty until it arrives) and `{path|longdate}` as day and written-out month
(year outside the current year, or always with `longdate:year`), and SHALL drop a token without a value together
with the separator before it. A line whose every token is empty SHALL not be drawn.

#### Scenario: A receipt without a cashier

- GIVEN the template `{amount|currency:EUR} · {cashier|user} · {at|longdate} {at|time}` and no cashier
- WHEN the header renders
- THEN the line reads "€ 96,41 · 7 oktober 11.43"
