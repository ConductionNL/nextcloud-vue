# board-pill-tones Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-pill-tones](../../)

## Purpose

Neutral tags and counts take the boards' soft ink and size.

## ADDED Requirements

### Requirement: A neutral board tag is soft text on the chip ground

In the board look the soft text token SHALL mix the main text with the muted text, and a default, non-solid
CnStatusBadge SHALL draw in that soft text on `--color-background-hover`.

#### Scenario: dossiq's tasks list

- **GIVEN** the tasks index in the board look
- **THEN** the "Normaal" priority tag is about #3d4047 on #f0f1f3

### Requirement: A board count is 16px tall

In the board look the quick-filter count, the saved-view count and the board view's column count SHALL sit on a 14px
line, 16px tall on their 1px pad, in the soft ink handed to `--nldesign-color-on-surface` as well, the count on the selected quick-filter chip SHALL be a bubble in the soft text, and the filter button's count SHALL hand its ink to `--nldesign-color-on-surface`.

#### Scenario: dossiq's Woo-verzoek board

- **GIVEN** the cases index of a case type as a board
- **THEN** each quick-filter count and column count is 16px tall
