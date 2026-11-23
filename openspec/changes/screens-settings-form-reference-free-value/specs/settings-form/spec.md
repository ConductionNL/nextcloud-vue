# settings-form Delta: screens-settings-form-reference-free-value

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-settings-form-reference-free-value](../../)

## Purpose

A reference field can still hold a value that is not an object, such as the URL of a logo.

## ADDED Requirements

### Requirement: A reference field can also take a typed value

A `reference` field with `free: true` SHALL draw a labelled text input (`freeLabel`) under the picker. It SHALL show the
value the form holds when that value is not one of the objects, and be empty otherwise. Typing SHALL set the field's
value (trimmed), saved in the form's one Save. With `freePattern`, a typed value that does not match SHALL be refused
with `freePatternMessage` before any write; a picked object SHALL NOT be checked against it. Without `free` the field
SHALL render as before.

#### Scenario: A logo URL

- **GIVEN** a logo field with `free: true`
- **WHEN** the person types `https://example.nl/logo.svg` and saves
- **THEN** the form PATCHes `{ logo: "https://example.nl/logo.svg" }`
