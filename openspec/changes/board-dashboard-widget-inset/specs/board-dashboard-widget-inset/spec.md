# board-dashboard-widget-inset Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-dashboard-widget-inset](../../)

## Purpose

Widgets on a board card start where the boards start them, on the card's side inset.

## ADDED Requirements

### Requirement: A board dashboard widget keeps the card's side inset

In the board look, on a bordered dashboard card, the task list, the step bar with its legend, the week strip, a bar
list or matrix, the activity items and a widget table's first and last columns SHALL sit
`--cn-board-dashboard-card-inset` (24px) from the card's sides. A borderless card keeps its rows flush.

#### Scenario: DqMijnWerk "Mijn taken"

- **GIVEN** a dashboard in the board look with a "Mijn taken" card holding a task list
- **THEN** each task's checkbox starts 24px inside the card's border, under the card's title

#### Scenario: DqMijnWerk "Mijn 14 zaken per stap"

- **GIVEN** a step bar card
- **THEN** the bar and the legend's dots and counts start 24px inside the card's border

### Requirement: A stat tile in a detail side card keeps the card's inset

In the board look, a stat tile in a detail page's side card SHALL sit on the side card's inset (10px 22px 20px) and
draw no padding of its own.

#### Scenario: DqZaak "Termijn"

- **GIVEN** a case detail page in the board look with a "Termijn" side card holding a countdown
- **THEN** the countdown's value starts 22px inside the card's border, under the card's title
