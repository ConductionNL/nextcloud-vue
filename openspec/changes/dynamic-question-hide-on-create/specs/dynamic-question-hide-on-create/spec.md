# dynamic-question-hide-on-create Delta

## Purpose

Let a data-driven question stay off the create form when the app answers it
itself.

## ADDED Requirements

### Requirement: A question can stay off the create form

A definition record whose `hideOnCreate` (or the field `map.hideOnCreate` of
the `x-openregister-extends-form` block names) is `true` SHALL get no field on
a `CnFormDialog` that creates an object, and SHALL NOT be required there. On a
form that edits an object it SHALL render as any other question. A record
without the flag SHALL render as before.

#### Scenario: The Woo receipt date on a new case

- **GIVEN** a case type whose definitions are "Onderwerp" and "Ontvangen op" with `hideOnCreate: true` and `isRequired: true`
- **WHEN** a person picks that case type on the create form
- **THEN** the form asks for "Onderwerp" and not for "Ontvangen op", and Create is not blocked by it
- @e2e exclude covered by `tests/components/CnFormDialogHideOnCreate.spec.js` through the real CnFormDialog; the definition fetch needs OpenRegister

#### Scenario: The same case edited

- **GIVEN** the same case type
- **WHEN** an existing case of that type is edited
- **THEN** "Ontvangen op" is on the form
- @e2e exclude covered by `tests/components/CnFormDialogHideOnCreate.spec.js`
