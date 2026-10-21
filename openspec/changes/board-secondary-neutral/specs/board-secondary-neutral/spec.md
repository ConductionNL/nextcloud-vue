# board-secondary-neutral Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-secondary-neutral](../../)

## Purpose

Board secondary buttons draw as the boards draw them.

## ADDED Requirements

### Requirement: A board secondary button is neutral

In the board look every secondary NcButton outside a breadcrumb SHALL draw on the main background with the main text
and a 1px `--cn-board-control-border`, and SHALL draw the hover ground on hover.

#### Scenario: DqTaak

- **GIVEN** dossiq's task page in the board look
- **THEN** "Afronden" and "Teruggeven" draw white with a grey 1px border and the main text

#### Scenario: Nextcloud look

- **GIVEN** an app without `look: "board"`
- **THEN** a secondary NcButton keeps Nextcloud's primary tint
