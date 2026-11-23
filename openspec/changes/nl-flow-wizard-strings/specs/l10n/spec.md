# l10n Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [nl-flow-wizard-strings](../../)

## Purpose

A Dutch reader meets the library in Dutch, and a new string cannot ship without its Dutch.

## ADDED Requirements

### Requirement: A new library string has Dutch

Every `t('nextcloud-vue', ...)` and `n('nextcloud-vue', ...)` string literal in src/ SHALL have an entry in l10n/nl.json,
except the strings listed in tests/l10n/nl-missing-baseline.json, which SHALL only shrink. The flow, wizard and stepper
strings SHALL all have Dutch, without em-dashes.

#### Scenario: The setup wizard

- **GIVEN** a Dutch reader in a setup wizard at step 2 of 4
- **THEN** the dialog is named "Instellen, stap 2 van 4"

#### Scenario: A new untranslated string

- **GIVEN** a component that adds `t('nextcloud-vue', 'Archive now')` with no Dutch
- **THEN** the catalogue spec fails until nl.json carries it
