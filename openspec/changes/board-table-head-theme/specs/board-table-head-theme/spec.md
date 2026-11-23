# board-table-head-theme Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-table-head-theme](../../)

## Purpose

A board table's header row keeps the board's values under a theme that styles table headers with `!important`.

## ADDED Requirements

### Requirement: A board table header keeps the board's ground, ink and weight under a theme

In the board look a table header cell SHALL set the nldesign table header tokens to the board's ground
(`--cn-board-table-head-bg`, by default 40% of the hover ground over the main background), the muted ink
(`--color-text-maxcontrast`) and weight 600, and the nldesign button weight token to 600.

#### Scenario: DqZaken under the nldesign theme

- **GIVEN** the cases index in the board look under the nldesign theme
- **THEN** the "Zaak" header label and its sort button draw at weight 600
