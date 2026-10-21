# board-segmented-soft-ink Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-segmented-soft-ink](../../)

## Purpose

Board segmented controls draw their options in the boards' inks.

## ADDED Requirements

### Requirement: A board segmented control draws the options not chosen in the soft ink

In the board look every option of a CnSegmentedControl that is not checked SHALL draw in `--cn-board-text-soft`; the
checked option SHALL keep the main text.

#### Scenario: DqDoorlooptijd

- **GIVEN** dossiq's lead time dashboard in the board look with the period "Maand" chosen
- **THEN** "Kwartaal" and "Jaar" draw in the soft ink and "Maand" in the main text
