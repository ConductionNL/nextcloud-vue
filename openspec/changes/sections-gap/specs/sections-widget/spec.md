# sections-widget Delta: sections-gap

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [sections-gap](../../)

## Purpose

Plain sections can stand as far apart as the board draws them.

## ADDED Requirements

### Requirement: Plain sections can set the space between them

A sections widget with `dividers: false` and a numeric `gap` SHALL stack its sections that many pixels apart. Without a
numeric `gap` the space SHALL stay 8px.

#### Scenario: Board PqJourney

- **GIVEN** the journey's facts and steps as plain sections with `gap: 14`
- **WHEN** the card is drawn
- **THEN** the steps stand 14px under the facts
