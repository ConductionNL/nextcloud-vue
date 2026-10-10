# form-override-labels Delta: screens-form-override-labels-parity

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-form-override-labels-parity](../../)

## Purpose

A form field relabelled in the manifest reads in the user's language, as the
DqNieuweZaak board draws it.

## ADDED Requirements

### Requirement: Override text reads in the user's language

`fieldsFromSchema` SHALL run a field override's `label`, `description` and
`placeholder`, when they are non-empty strings, through the `translate`
option, after merging the override. Without a `translate` option the text
SHALL stay as written. Other override keys SHALL merge as before. The Dutch
library catalogue SHALL render the optional-field suffix `optional` as
"niet verplicht".

#### Scenario: The requester on the new case form

- **GIVEN** a case form whose `fieldOverrides.requester.label` is Requester, and an app catalogue with Aanvrager, for a Dutch user
- **WHEN** the form renders
- **THEN** the field reads Aanvrager (niet verplicht)

@e2e include Open the new case form on dossiq/DqNieuweZaak with the user language nl.

#### Scenario: No translate function

- **GIVEN** the same override and no translate option
- **WHEN** the fields are built
- **THEN** the label reads Requester
