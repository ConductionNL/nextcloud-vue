# board-follow-pill Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-follow-pill](../../)

## Purpose

The follow control on a detail page looks as the boards draw it.

## ADDED Requirements

### Requirement: The board follow control is a pill

In the board look the follow control's buttons on a detail page SHALL be 28px tall with 10px side padding, a
`--color-border-dark` border, a 14px radius, the main background and the main text at 13px weight 600, and a 14px icon
6px from the label. The followed state keeps its primary-coloured icon.

#### Scenario: DqZaak "Volgen"

- **GIVEN** a case detail page in the board look under the nldesign theme
- **THEN** "Volgen" is a 28px pill with 13px text at weight 600 in the main text colour on the main background
