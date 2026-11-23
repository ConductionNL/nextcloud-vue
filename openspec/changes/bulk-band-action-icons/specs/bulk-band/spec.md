# bulk-band Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [bulk-band-action-icons](../../)

## Purpose

The bulk band draws the icons its actions declare.

## ADDED Requirements

### Requirement: A bulk action's icon draws in the band

A bulk action with `icon` SHALL draw that icon before its label in the bulk band; one without SHALL draw its label only.

#### Scenario: DqZaken

- **GIVEN** the case list's bulk band with "Opschorten" declaring `PauseCircleOutline`
- **THEN** the button shows the pause icon before "Opschorten"
