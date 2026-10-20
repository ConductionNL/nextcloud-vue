# board-follow-row Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-follow-row](../../)

## Purpose

The Follow control on a board detail page sits where the boards draw it.

## ADDED Requirements

### Requirement: The board follow control sits under the breadcrumb

In the board look the detail page SHALL draw the Follow control on a row of its own under the breadcrumb row, not on
the title row. It SHALL keep the follower count and follower management. Without the board look it SHALL stay beside
the title.

#### Scenario: DqZaak "Volgen"

- **GIVEN** a case detail page in the board look on a record that can be followed
- **THEN** "Volgen" and its count are on the row under the breadcrumb, and the title row holds only the title and the actions

#### Scenario: Plain Nextcloud

- **GIVEN** a detail page without the board look
- **THEN** the Follow control stays beside the title
