# board-dashboard-card-header Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-dashboard-card-header](../../)

## Purpose

A dashboard card's header is drawn as the boards draw it.

## ADDED Requirements

### Requirement: A board dashboard card draws no header rule

In the board look, a dashboard card SHALL draw no rule under its title, whatever widget it holds. A bordered card's
title SHALL sit 20px from the card's top and `--cn-board-dashboard-card-inset` (24px) from its sides, 12px above the
content. A card in the Nextcloud dashboard chrome keeps its own header, and a borderless card keeps the wrapper's
padding.

#### Scenario: DqMijnWerk "Mijn taken"

- **GIVEN** a dashboard in the board look with a "Mijn taken" card holding a task list
- **THEN** no line is drawn between the title and the first task
- **AND** the title starts 24px inside the card's border

#### Scenario: Plain stat tiles

- **GIVEN** a dashboard in the board look with a card of plain stat tiles
- **THEN** no line is drawn under its title
