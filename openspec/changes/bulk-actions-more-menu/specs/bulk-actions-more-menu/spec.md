# bulk-actions-more-menu

## ADDED Requirements

### Requirement: A bulk action can sit under More

A bulk action declared with `menu: true` MUST NOT render as a button in the
selection strip or the bulk band; it SHALL be listed in a More menu after the
buttons, and choosing it MUST emit `bulk-action` with its id and the current
selection. Without any such entry no More menu SHALL render.

#### Scenario: Lock under More

- **GIVEN** bulk actions Publish and Lock, Lock with `menu: true`, and two rows selected
- **WHEN** the selection bar renders
- **THEN** Publish is a button and Lock is not
- **AND** the More menu lists Lock, and choosing it emits `bulk-action` with id `lock` and the two ids
