# detail-page Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [detail-consumer-widget-card](../../)

## Purpose

An app's own widget on a detail card surface looks like every other card there.

## ADDED Requirements

### Requirement: A consumer widget on a card surface gets the titled card

On a card surface outside a body grid cell, CnDetailWidgetHost SHALL draw a consumer-registry widget inside the titled
card (CnWidgetWrapper) with the widget definition's title. A registry entry with `selfChromed: true` SHALL be drawn
without it. In a body grid cell and in bare chrome the widget SHALL be drawn as before.

#### Scenario: The location map in the side column

- **GIVEN** an app widget `case-map` titled "Locaties" in the side column
- **THEN** it shows in a card titled "Locaties"

#### Scenario: A widget that draws its own card

- **GIVEN** a registry entry `{ component, selfChromed: true }`
- **THEN** no second card is drawn around it
