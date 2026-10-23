# Proposal: board-delete-view-confirm-header

## Why

COMPDIFF r24 on DqFilterVerwijderen: the board heads the "Delete view?" confirm like the saved view's edit and share
dialogs, with the eyebrow "Saved view" above the title and the view's name under it. Live showed the bare title, so
the title sat 23px higher and the sentence 11px closer under it.

## What changes

In the board look the index page's delete-view confirm passes CnConfirmDialog the eyebrow "Saved view" and the view's
name as subtitle, and the dialog is 520px wide, as DqFilterVerwijderen draws it (the boards are canon; other confirm
dialogs keep the confirm role's 560px). The Nextcloud look is unchanged.
