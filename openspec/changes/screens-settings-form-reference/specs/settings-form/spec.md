# settings-form Delta: screens-settings-form-reference

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-settings-form-reference](../../)

## Purpose

A setting that points at another object is picked, not typed.

## ADDED Requirements

### Requirement: A settings form field can pick an object

A settings-form field of type `reference` SHALL list the objects of its `register` and `schema`, and on Save SHALL
store the chosen object's reference as a string in the format of `valueTemplate` (the id when absent). A stored value
that is none of the listed objects SHALL stay selectable unchanged. The field SHALL be part of the form's one Save.

#### Scenario: A logo from the assets

- **GIVEN** a field `{ key: "logo", type: "reference", register: "portaliq", schema: "asset", valueTemplate: "openregister://{register}/{schema}/{id}" }` and a stored URL
- **WHEN** the person chooses the asset "Woordmerk" (id a-2) and saves
- **THEN** one PATCH sends `logo` "openregister://portaliq/asset/a-2"

#### Scenario: Nothing chosen

- **WHEN** the person opens the form and saves without choosing
- **THEN** the stored URL is still selected and nothing is sent
