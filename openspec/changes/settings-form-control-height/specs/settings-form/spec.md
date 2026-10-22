# settings-form Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [settings-form-control-height](../../)

## Purpose

A settings form's fields keep their height.

## ADDED Requirements

### Requirement: A settings form's field is 40px tall under Nextcloud's core input rule

A CnSettingsFormWidget text field or select SHALL be as tall as `--cn-board-control-height` (40px), also where
Nextcloud's core stylesheet sets a text input's height.

#### Scenario: PtPortalInstellingen

- **GIVEN** the portal settings form
- **THEN** "Naam van de portal" is 40px tall
