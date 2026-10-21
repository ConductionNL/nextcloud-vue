# board-dialog-theme Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-dialog-theme](../../)

## Purpose

A board dialog keeps the board's frame and inset under a theme that restyles dialogs with `!important`.

## ADDED Requirements

### Requirement: A board dialog keeps its frame and inset under a theme

A board dialog SHALL set the nldesign dialog radius token to `--cn-board-card-radius` (12px), or 16px 16px 0 0 as a
phone's bottom sheet, SHALL draw its shadow even where the theme removes dialog shadows, and SHALL draw no container
padding of NcDialog's own, so its title and fields sit 24px from the dialog's edge.

#### Scenario: DqNieuweZaak under the nldesign theme

- **GIVEN** the new case dialog in the board look under the nldesign theme
- **THEN** the dialog has a 12px radius and a shadow
- **AND** its title and first field label start 24px from its left edge
