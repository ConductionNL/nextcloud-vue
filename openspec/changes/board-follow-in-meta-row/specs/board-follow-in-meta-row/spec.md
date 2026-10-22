# board-follow-in-meta-row Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-follow-in-meta-row](../../)
- replaces [board-follow-row](../../../board-follow-row/)

## Purpose

The board header is two rows, as the case boards draw it.

## MODIFIED Requirements

### Requirement: The board follow control ends the meta row

In the board look the detail page SHALL draw the Follow control at the end of the meta row under the title (after the
pills, the breadcrumb, the meta line and the chips), not on a row of its own and not on the title row. It SHALL keep
the follower count and follower management. Without the board look it SHALL stay beside the title.

#### Scenario: DqZaak

- **GIVEN** a case detail page in the board look on a record that can be followed
- **THEN** "Volgen" and its count end the row with the case pills, and the header has no third row

#### Scenario: Plain Nextcloud

- **GIVEN** a detail page without the board look
- **THEN** the Follow control stays beside the title
