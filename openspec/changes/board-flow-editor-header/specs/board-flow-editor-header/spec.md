# board-flow-editor-header Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-flow-editor-header](../../)

## Purpose

The board-look flow editor has the board page header and palette.

## ADDED Requirements

### Requirement: The board flow editor has the board page header and plain palette steps

`CnFlowBoard` SHALL pad its page with `--cn-board-content-padding`. In the board look the buttons in
`.cn-flow-board__actions` SHALL take the board header button rules. A palette step SHALL draw at weight 400 and hand
`--nldesign-component-button-font-weight` the value 400.

#### Scenario: DqFlow header

- **GIVEN** a flow in the board look
- **THEN** its title starts 28px from the navigation, "Opslaan" is a 40px primary header button and "Status zetten" in
  the palette is a 400 label, as on board DqFlow
