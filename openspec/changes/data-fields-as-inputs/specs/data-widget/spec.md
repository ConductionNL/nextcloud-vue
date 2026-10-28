# data-widget Delta: data-fields-as-inputs

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [data-fields-as-inputs](../../)

## Purpose

A record's facts can read as the form the board draws.

## ADDED Requirements

### Requirement: A data card can draw its values as inputs with a hint

A data widget with `fieldLook: "input"` SHALL draw each value as an input box under its label, and a click SHALL still
edit the field in place. A field whose override has a `hint` SHALL show it, translated, as a muted line under the value.

#### Scenario: Board PqOfferte

- **GIVEN** the quote's title with the hint "Printed on the PDF"
- **WHEN** the Quote card draws its fields with `fieldLook: "input"`
- **THEN** the title reads in an input box with "Staat op de pdf" under it, and a click edits it
