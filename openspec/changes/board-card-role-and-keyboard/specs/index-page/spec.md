# index-page Delta: board-card-role-and-keyboard

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-card-role-and-keyboard](../../)

## Purpose

A card on `CnBoardView` is a tab stop with no role, opened by Enter and not by
Space, and it contains a `<select>`. Name what a card is, and make each thing a
person can do on it a control in its own right. Raised by gate 32
`semantic-controls` in the quality sweep of `parity/round2` on 2026-09-18, on
the board that `status-board-and-date-axis` added.

## ADDED Requirements

### Requirement: A board card is a container, and its actions are controls

A card on `CnBoardView` SHALL be a non-interactive container. It SHALL NOT
carry `tabindex`, a click handler or a key handler, and it SHALL NOT be given
`role="button"`.

Each thing a person can do on a card SHALL be its own native control, and those
controls SHALL be siblings rather than nested. Opening a card SHALL be a
`<button>` whose accessible name is the card's label. Moving a card SHALL
remain the existing `<select>`, and that `<select>` SHALL NOT be a descendant of
the opening button.

The cards in a column SHALL form a list, so that each card is a list item and
the number of cards in the column is conveyed. The column itself SHALL remain a
list item of the board's own list of columns.

Dragging SHALL stay on the card container, which SHALL keep `draggable` and its
`dragstart` handler. The `card-click` event and its payload SHALL NOT change.

#### Scenario: A card announces what it is, not only what it is called

- **GIVEN** a board with cards in a column
- **WHEN** a screen-reader user moves through the column
- **THEN** each card is announced as a list item, with the column's card count, and the control that opens it is announced as a button carrying the card's name

@e2e exclude asserted with axe in tests/a11y/CnBoardView.a11y.spec.js; the announcement itself is not observable from Playwright.

#### Scenario: Space opens a card, as Enter does

- **GIVEN** a handler moving through a board from the keyboard
- **WHEN** they focus a card's opening control and press Space
- **THEN** the card opens, emitting the same `card-click` payload that Enter and a pointer click emit

@e2e exclude a keyboard-only interaction on one component; asserted in tests/components/CnBoardView.spec.js.

#### Scenario: The move control is reachable from the keyboard

- **GIVEN** a card whose board allows moves
- **WHEN** a handler tabs past the card's opening control
- **THEN** the Move to select is the next stop, operable on its own, and it is not inside the opening control

@e2e exclude the keyboard move path is a component concern; asserted in tests/components/CnBoardView.spec.js.

#### Scenario: A pointer affordance does not make the card focusable

- **GIVEN** a board that lets a pointer click anywhere on a card to open it
- **WHEN** a keyboard user tabs through the column
- **THEN** each card offers exactly one tab stop per action it carries, and the card container is not one of them

@e2e exclude a tab-order assertion over one component; asserted in tests/components/CnBoardView.spec.js.

### Requirement: The board carries an accessibility spec of its own

`CnBoardView` SHALL have a spec under `tests/a11y/`, run by
`npm run check:a11y`, asserting the rendered board against axe.

The library's main unit lane stubs `@nextcloud/vue` down to a permissive
element, so an accessibility assertion made there passes against markup that
has no ARIA in it. A component without a `tests/a11y/` spec is therefore not
covered by anything, and its absence is indistinguishable from its success.

#### Scenario: The board is judged by axe

- **GIVEN** a board rendered with two columns and cards in each
- **WHEN** `npm run check:a11y` runs
- **THEN** the board is one of the suites it reports, and it passes with no axe violations

@e2e exclude this is the a11y jest lane, not a browser journey.

#### Scenario: The spec can fail

- **GIVEN** the accessible name removed from a card's opening control
- **WHEN** the a11y spec runs
- **THEN** it fails and names that control

@e2e exclude a mutation check on a unit spec.
