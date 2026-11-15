# create-form-date-number-timer Delta: create-form-date-number-timer

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [create-form-date-number-timer](../../)

## Purpose

A card on a record logs a dated number against that record, such as hours worked, with or without a timer.

## ADDED Requirements

### Requirement: A form has date and number fields

`CnCreateFormWidget` SHALL draw a field of type `date` or `number` as an input of that type. A `number` field SHALL be
written as a number. A required one SHALL hold the submit while it is empty.

#### Scenario: Board DqZaak "Uren vastleggen"

- **GIVEN** a `date` field and a required `number` field "hours"
- **WHEN** the user fills in 2.5 and saves
- **THEN** the object is created with the number 2.5

### Requirement: The values can name the record of the page

`values` SHALL resolve `@objectId` and `@object.<field>` from the `objectId` and `objectData` props.

#### Scenario: Hours on a case

- **GIVEN** `values` `{ "case": "@objectId" }` and `objectId` "c-1"
- **THEN** the created object holds `case` "c-1"

### Requirement: A timer fills a field

With `content.timer` naming a field of the form, the widget SHALL draw a button that starts a timer, show the running time
in a `timer` role, and on stop write the time into that field: hours with two decimals, or whole minutes with
`unit: "minutes"`, and never less than the smallest step. A `timer` naming no field of the form SHALL draw nothing.

#### Scenario: Board DqZaak "Timer starten"

- **GIVEN** a timer on the field "hours"
- **WHEN** the user starts the timer and stops it after 90 minutes
- **THEN** the field holds 1.5 and no object is created until the user saves
