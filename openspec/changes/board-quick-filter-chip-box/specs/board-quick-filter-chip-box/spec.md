# board-quick-filter-chip-box Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-quick-filter-chip-box](../../)

## Purpose

The quick-filter and saved-view chips have the box the boards draw.

## ADDED Requirements

### Requirement: Board quick-filter chips take the board's box

In the board look the selected quick-filter or saved-view chip SHALL have no border, and a chip's count SHALL set its
figure at the font's normal line height.

#### Scenario: DqZaken "Alles 48"

- **GIVEN** the cases index in the board look with "Alles" selected
- **THEN** the "Alles" chip has no border and its count bubble is 16px high

#### Scenario: An idle chip

- **GIVEN** an idle chip such as "Mijn zaken 14"
- **THEN** it keeps its 1px border and its count bubble is 16px high
