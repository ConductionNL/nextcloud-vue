# ordered-list-field

**Status**: proposed
**Scope**: nextcloud-vue

## Purpose

Let a user keep an ordered list without dragging.

## ADDED Requirements

### Requirement: A user keeps an ordered list with the keyboard

CnOrderedListField SHALL draw the values of `modelValue` in order as an `<ol>` labelled by `label`, each row with a
named move up, move down and remove button (the first row's move up and the last row's move down disabled). A move,
a removal or an addition SHALL emit `update:modelValue` with the new values and announce the change in a polite live
region. An NcSelect with `inputLabel` SHALL offer the choices not listed yet and add the picked one at the end; with
`searchable` it SHALL emit `search` with the typed text and leave filtering to the app.

#### Scenario: Move a case type up

- **GIVEN** the list Woo request, Objection, Environment permit
- **WHEN** the user presses "Move Objection up"
- **THEN** `update:modelValue` carries objection, woo, permit and the live region says "Objection moved to position 1 of 3"
