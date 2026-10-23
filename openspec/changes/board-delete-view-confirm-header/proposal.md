# Proposal: board-delete-view-confirm-header

## Why

COMPDIFF r24 on DqFilterVerwijderen: the board heads the "Delete view?" confirm like the saved view's edit and share
dialogs, with the eyebrow "Saved view" above the title and the view's name under it. Live showed the bare title, so
the title sat 23px higher and the sentence 11px closer under it.

## What changes

In the board look the index page's delete-view confirm passes CnConfirmDialog the eyebrow "Saved view" and the view's
name as subtitle. The Nextcloud look is unchanged. The board's 520px width is not taken: the dialog canon allows the
confirm role 560px only.
