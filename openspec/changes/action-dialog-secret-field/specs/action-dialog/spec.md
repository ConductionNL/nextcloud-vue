# action-dialog Delta: action-dialog-secret-field

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [action-dialog-secret-field](../../)

## Purpose

An action dialog can edit a record, including a value that is never shown back.

## ADDED Requirements

### Requirement: A field can start from the record and a secret is write-only

A field with `valuePath` SHALL start with that value of the record. A field of type `secret` SHALL be a password input with `autocomplete="new-password"` that never shows a stored value. While `storedPath` reads true on the record it SHALL say "Stored. Type a new value to replace it." and SHALL NOT be required, and the dialog SHALL send it only when something was typed.

#### Scenario: Renaming a cashier who has a PIN

- **GIVEN** the record `{ name: 'Anna', hasPin: true }` and the fields name (`valuePath: 'name'`) and pin (`secret`, `storedPath: 'hasPin'`)
- **WHEN** the user changes the name to "Anna B" and confirms
- **THEN** the dialog sends `{ name: 'Anna B' }` and no pin

#### Scenario: A new cashier

- **GIVEN** the record `{ name: 'Bram', hasPin: false }`
- **THEN** the confirm button stays off until a PIN is typed, and the PIN is sent
