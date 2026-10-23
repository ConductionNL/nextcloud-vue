# board-macros-rows Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-macros-rows](../../)

## Purpose

A macros row reads as the boards draw a card's list row.

## ADDED Requirements

### Requirement: A board macros row is a board list row

In the board look a CnMacrosWidget row's name SHALL be weight 500, and the name and its description line SHALL use the
font's normal line height. The Nextcloud look SHALL keep the widget's own row.

#### Scenario: DqZaakAssistent "Macro's"

- **GIVEN** a case's assistant tab in the board look with the macros widget
- **THEN** "Woo-verzoek afronden" reads at weight 500 with its description under it, in a 56px row
