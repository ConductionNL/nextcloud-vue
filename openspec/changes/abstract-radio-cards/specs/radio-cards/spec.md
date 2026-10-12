# radio-cards Delta: abstract-radio-cards

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [abstract-radio-cards](../../)

## Purpose

One choice out of a few cards, bound to an enum field of the current object, from configuration.

## ADDED Requirements

### Requirement: Radio cards draw one card per configured option

The `radio-cards` widget SHALL draw one card per `content.options` entry with a radio input, a title and an optional
description, in `content.columns` columns (1, 2 or 3, default 2), the card whose value equals `objectData[field]`
selected.

#### Scenario: Aanmelden

- **GIVEN** three options and the stored value "approval"
- **WHEN** the widget renders
- **THEN** three cards show, the second one selected and its radio checked

### Requirement: Choosing a card saves that one field

Choosing a card SHALL PATCH only `content.field` with the option's value, SHALL disable the inputs while the request
runs, and SHALL return to the last saved choice and show the server's message when the PATCH is refused. `readOnly`
SHALL disable every input.

#### Scenario: A refused choice

- **WHEN** the server refuses the PATCH
- **THEN** the stored card is selected again and the server's words show
