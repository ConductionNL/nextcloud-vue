# countdown-board-look Delta: countdown-board-look

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [countdown-board-look](../../)

## Purpose

The countdown widget can draw the term card of board DqZaak.

## ADDED Requirements

### Requirement: The countdown draws the board's term card

CnCountdownWidget SHALL take `daysLabel` `{ one, other }` with `{count}` as the headline while days remain, `caption`
as the line under it with `{date}` and `{count}` filled, `startField` to draw a bar of the share of the term that has
passed, and `action` to draw one button that dispatches that manifest action with the record's tokens resolved. In the
board look it SHALL draw no icon circle. Without these keys the widget SHALL read as before.

#### Scenario: Board DqZaak "Termijn"

- **GIVEN** a case with its deadline 27 days ahead and registered 3 days ago
- **AND** `daysLabel` "{count} dag" / "{count} dagen", `caption` "Beslissen uiterlijk {date}" and `startField`
- **THEN** the card reads "27 dagen" and "Beslissen uiterlijk" with the date
- **AND** the bar is filled 10%
- **AND** in the board look no icon circle is drawn

#### Scenario: The action

- **GIVEN** `action: { label: "Termijn opschorten", type: "handler", handler: "suspendTerm", args: ["@objectId"] }`
- **WHEN** the user presses "Termijn opschorten"
- **THEN** the page dispatcher receives the action with the case id in its args
