# detail-pill-values Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [detail-pill-values](../../)

## Purpose

A header pill can be drawn for some values of its field only.

## ADDED Requirements

### Requirement: A header pill can be limited to some values

A header pill with a `field` and a `values` list SHALL be drawn only when the field's raw value is in `values`, and
SHALL draw nothing for any other value.

#### Scenario: DqTaak

- **GIVEN** a task page whose `typePill` reads `priority` with `values: ["high", "urgent"]`
- **THEN** a high task shows the priority pill and a normal task shows none
