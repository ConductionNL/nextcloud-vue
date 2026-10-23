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

### Requirement: The board delete-view confirm is 520px wide

CnIndexPage's delete-saved-view confirm SHALL carry the class `cn-index-page__delete-view-confirm`, and in the board
look its dialog SHALL be 520px wide (`--cn-dialog-width` on the container, over the confirm role's 560px). Other confirm
dialogs and the Nextcloud look SHALL be unchanged.

#### Scenario: The delete-view confirm's width

- GIVEN DqFilterVerwijderen in the board look
- WHEN the delete-view confirm opens
- THEN the dialog is 520px wide
