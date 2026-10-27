# board-bar-toggles-own-line Delta: board-bar-toggles-own-line

**Status**: in-progress
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-bar-toggles-own-line](../../)

## Purpose

Lay out the board actions bar's lines as the dossiq list boards draw them.

## ADDED Requirements

### Requirement: The board actions bar lays out its lines as the boards draw them

In the board look the actions bar SHALL keep its lines and items 8px apart
and SHALL put the search row 20px under the line before it. With the side
panel open the view switch SHALL start a line of its own under row 1 and the
Filter button SHALL take the end of row 1.

#### Scenario: Side panel open, no Save view

- **GIVEN** an index page in the board look with the side panel open and an unchanged saved view applied
- **WHEN** the actions bar renders
- **THEN** Filter ends row 1 at the right, the view switch starts the next line 8px down, and the search row sits 20px under the switch
