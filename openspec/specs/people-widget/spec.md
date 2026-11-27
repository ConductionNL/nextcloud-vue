# people-widget

## Purpose

How CnPeopleWidget lists colleagues.

## Requirements

### Requirement: A people widget can leave out its search box

`CnPeopleWidget` SHALL show its search box and refresh button unless `content.showSearch` is `false`; with `false`
neither renders and the list starts under the card title.

#### Scenario: New colleagues without a search box
- **GIVEN** a people widget with `content.showSearch: false`
- **THEN** no search box and no refresh button render
- **AND** the users still list

@e2e exclude A rendering switch; the unit test mounts the widget (tests/components/CnPeopleWidgetBoardRows.spec.js).

### Requirement: A board people list is ruled rows

In the board look, a people widget inside a widget card SHALL have no padding of its own, and its list layout SHALL
draw every row with a hairline above it (the first too), 10px above and below, the name 15px bold and its lines 13px
muted; the list SHALL carry `cn-board-ruled-rows`.

#### Scenario: Launchpad "Vind een collega op expertise"
- **GIVEN** the board look and a people widget in list layout in a widget card
- **THEN** its first row starts 19px from the card's edge, under a hairline

@e2e exclude Stylesheet rules; the unit test reads them from look-board.css.
