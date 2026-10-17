# detail-page Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [detail-consumer-widget-card](../../)

## Purpose

An app's own widget on a detail card surface looks like every other card there.

## ADDED Requirements

### Requirement: A consumer widget on a card surface gets the titled card

On a card surface outside a body grid cell, CnDetailWidgetHost SHALL draw a consumer-registry widget whose registry
entry says `chrome: "card"` inside the titled card (CnWidgetWrapper) with the widget definition's title. Without it, in
a body grid cell and in bare chrome, the widget SHALL be drawn as before.

#### Scenario: The location map in the side column

- **GIVEN** an app widget `case-map` titled "Locaties" in the side column, registered with `chrome: "card"`
- **THEN** it shows in a card titled "Locaties"

#### Scenario: A widget that draws its own card

- **GIVEN** a registry entry without `chrome: "card"`
- **THEN** no card is drawn around it, as before
