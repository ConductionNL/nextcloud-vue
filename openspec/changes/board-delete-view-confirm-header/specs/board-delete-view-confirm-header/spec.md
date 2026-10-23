# board-delete-view-confirm-header Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-delete-view-confirm-header](../../)

## Purpose

The delete-view confirm is headed like the other saved-view dialogs.

## ADDED Requirements

### Requirement: The board delete-view confirm names the saved view

In the board look, CnIndexPage's delete-saved-view confirm SHALL show the eyebrow "Saved view" and the view's name as
its subtitle. In the Nextcloud look both SHALL be empty.

#### Scenario: Deleting a shared view

- GIVEN DqFilterVerwijderen in the board look, deleting the view "Wacht op inwoner"
- WHEN the confirm opens
- THEN "Saved view" stands above "Delete view?" and "Wacht op inwoner" under it
