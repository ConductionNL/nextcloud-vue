# choice-picker Delta: abstract-choice-picker

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [abstract-choice-picker](../../)

## Purpose

Choose one card from a catalogue with swatches and a verdict, and confirm a risky choice on purpose, from configuration.

## ADDED Requirements

### Requirement: A choice picker draws cards from a source with swatches and a state pill

The `choice-picker` widget SHALL draw one card per item of `content.items` and `content.source`, with a radio, the
swatch colours read from the item, a title and a state pill mapped from `source.state.path` (`state.empty` when the
value is missing), the card whose key equals `objectData[field]` selected. A card whose `refusal` is set SHALL show the
reason and SHALL NOT be choosable. Choosing a card SHALL write nothing.

#### Scenario: Huisstijl

- **GIVEN** three sets, one with a failing verdict, one without a verdict and one refused
- **WHEN** the widget renders
- **THEN** the pills read Leesbaar, Slecht leesbaar and Niet gecontroleerd and the refused set shows its reason

### Requirement: A risky choice is saved only on purpose

A selected card with warning lines SHALL show them in a warning band and a confirm button next to Save. Save and the
confirm button SHALL send the same request with `@confirmed` false and true respectively. Without `content.save` the
request SHALL be a PATCH of `content.field` with the key. A refused request SHALL show the server's message.

#### Scenario: Toch gebruiken

- **WHEN** the person selects "Zuiddrecht licht" and presses "Toch gebruiken"
- **THEN** the request carries the key and `acceptFindings: true`
