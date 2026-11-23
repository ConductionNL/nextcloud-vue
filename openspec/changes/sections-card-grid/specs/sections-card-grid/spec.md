# sections-card-grid Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [sections-card-grid](../../)

## Purpose

A sections widget can group widgets as a grid of small cards, the boards' card of cards.

## ADDED Requirements

### Requirement: A sections widget can lay its cards out in columns

A `sections` widget with `columns` between 2 and 4 SHALL lay its sections out side by side, at most that many to a row
and each at least 240px wide, wrapping onto more rows in a narrower cell. A larger value SHALL be read as 4. Without
`columns`, with 1, or when a section asks for the side column, the sections SHALL stack as before. On a dashboard the
widget SHALL receive the page's widget definitions, so a section can name a sibling widget by id.

#### Scenario: DqDoorlooptijd compliance

- **GIVEN** a dashboard `sections` widget with `cards: true`, `columns: 3` and four chart sections
- **THEN** the four charts render as cards, three on the first row and one on the second

### Requirement: A sections widget can close with a footnote

A `sections` widget with a `footnote` SHALL draw it, translated, as a muted line under the sections.

#### Scenario: Footnote

- **GIVEN** `footnote: "Click a case type to see its cases."`
- **THEN** the line appears once under the cards

### Requirement: A board card of cards draws the board's small cards

In the board look a sections grid on a dashboard card SHALL keep the card's side inset and 20px below, and each section
SHALL be a card with a hairline edge, a 10px corner and 14px 16px of padding, its heading at 15px 700, 10px above the
content.

#### Scenario: DqDoorlooptijd small cards

- **GIVEN** the Zuiddrecht set and the compliance group above
- **THEN** "Naleving per zaaktype" is a 15px bold heading in a 10px-cornered card about 349px wide
