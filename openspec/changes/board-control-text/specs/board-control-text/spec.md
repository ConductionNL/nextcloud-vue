# board-control-text Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-control-text](../../)

## Purpose

Board buttons draw their text at the boards' size.

## ADDED Requirements

### Requirement: A board button draws its text at 14px

In the board look every NcButton outside a breadcrumb SHALL set `--default-font-size` to 14px. A surface that sets its
own `font-size` keeps it.

#### Scenario: DqZaakTaken

- **GIVEN** dossiq's case page, tab Taken, in the board look
- **THEN** "Nieuwe taak" draws its text at 14px

#### Scenario: Nextcloud look

- **GIVEN** an app without `look: "board"`
- **THEN** an NcButton keeps Nextcloud's `--default-font-size`
