# board-primary-no-edge Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-primary-no-edge](../../)

## Purpose

Board primary buttons draw as the boards draw them.

## ADDED Requirements

### Requirement: A board primary button draws no edge

In the board look every primary NcButton outside a breadcrumb SHALL draw without a border.

#### Scenario: DqZaak

- **GIVEN** dossiq's case page in the board look
- **THEN** "Volgende stap" draws its fill with no border

#### Scenario: Nextcloud look

- **GIVEN** an app without `look: "board"`
- **THEN** a primary NcButton keeps NcButton's border
