# board-button-weight Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-button-weight](../../)

## Purpose

Board buttons draw at the boards' weight.

## ADDED Requirements

### Requirement: A board button draws at 600

In the board look every NcButton outside a breadcrumb SHALL set `--font-weight-element` to 600.

#### Scenario: DqTeamwachtrij

- **GIVEN** dossiq's queue page in the board look
- **THEN** "Downloaden", "Acties" and "Filter" draw at weight 600
