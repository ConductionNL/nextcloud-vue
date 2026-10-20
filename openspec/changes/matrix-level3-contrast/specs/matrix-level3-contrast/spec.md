# matrix-level3-contrast Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [matrix-level3-contrast](../../)

## Purpose

Every matrix cell's figure is readable on its ground.

## ADDED Requirements

### Requirement: A matrix cell keeps a readable ink

Each matrix level SHALL draw its figure in an ink that reaches 4.5:1 on its ground under Nextcloud's default light and
dark tokens. The light levels SHALL use a dark ink; white (the primary text colour) SHALL be used only on the full
primary.

#### Scenario: Level 3 in plain Nextcloud

- **GIVEN** a matrix cell at level 3 under the default light theme
- **THEN** its figure is in the main text colour, at least 4.5:1 on the 65% tint

#### Scenario: Level 4

- **GIVEN** a matrix cell at level 4
- **THEN** its figure stays in the primary text colour on the primary
