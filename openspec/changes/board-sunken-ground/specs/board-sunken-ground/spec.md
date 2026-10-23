# board-sunken-ground Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-sunken-ground](../../)

## Purpose

A block sunk into a card sits on the page's own ground, as the boards draw it.

## ADDED Requirements

### Requirement: Sunken blocks take the board's sunken ground

The board look SHALL define `--cn-board-sunken-ground` as `--nldesign-component-content-surface-background-color`,
falling back to `--color-background-hover`. In the board look a CnGroupedCardsWidget group, a CnDeviceFramesWidget
frame and a CnConversationThread bubble of a message that is not ours SHALL take it as their background. Our own
bubbles and the Nextcloud look SHALL be unchanged.

#### Scenario: The phases of a case type

- GIVEN DqZaaktype's "Fasen en taken" tab in the board look under thematiq
- WHEN the phase groups render
- THEN each group is on rgb(245, 246, 248), the page's ground
