# facts-widget Delta: facts-tiles

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [facts-tiles](../../)

## Purpose

Draw a short sequence of facts, such as the steps of a journey, as tiles the way the boards do.

## ADDED Requirements

### Requirement: Facts can be drawn as tiles

A facts widget with `layout: "tiles"` SHALL draw each fact as a tile of its own: a bordered box with the label in small
caps above the value, the tiles side by side and wrapping onto the next line when there is no room. A fact without a
value SHALL be left out, as in the other layouts. Without `layout` the rows SHALL stay as they were.

#### Scenario: The steps of a journey

- **GIVEN** a journey with a trigger label, a wait and an action, and no condition
- **WHEN** a facts widget with `layout: "tiles"` lists Trigger, Wait, Condition and Action
- **THEN** it draws three tiles, Trigger, Wait and Action, each with its label above its value
