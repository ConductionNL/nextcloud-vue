# default-views-secondary Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [default-views-secondary](../../)

## Purpose

A page with many default views shows the few the board draws, and keeps the others a click away.

## ADDED Requirements

### Requirement: A default view can wait behind More default views

A default view declaring `secondary: true` SHALL be left out of the panel's default views until the reader opens
"More default views" (a button with `aria-expanded`), or while it is the applied view. A default view MAY declare a
`description`, shown translated as its line.

#### Scenario: DqFilterBeheren

- **GIVEN** the Cases page declares Mijn zaken, Alle lopende zaken and Termijn verstreken, and six more as secondary
- **WHEN** Pieter opens the Weergaven tab
- **THEN** "Standaardweergaven" lists the three with their lines, and "Meer standaardweergaven" shows the other six
