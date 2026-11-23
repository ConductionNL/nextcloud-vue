# board-text-field-height Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-text-field-height](../../)

## Purpose

Board text fields are as tall as the boards draw them.

## ADDED Requirements

### Requirement: A board text field is 40px tall

In the board look every NcTextField outside a select SHALL be 40px tall (`--cn-field-height`). In plain Nextcloud it
SHALL keep Nextcloud's height.

#### Scenario: PtPortalInstellingen

- **GIVEN** portaliq's sign-in settings on a portal, in the board look
- **THEN** "Startadres" is 40px tall
