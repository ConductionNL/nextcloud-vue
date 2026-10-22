# Proposal: board-notice-ink

## Why

COMPDIFF r22 measured DqZaak's "Advies gevraagd" notice on 12 case boards. Once the note inside the notice is flat
(board-side-notice-flat-note), the notice still differs from the board in three ways: the text is set in the main ink
(board: the notice's amber ink), the icon is 20px (board: 18px), and the gap between the icon and the text is 8px
(board: 10px).

## What changes

In the board look the side notice's text and icon take a new `--cn-board-notice-ink` token, which defaults to
Nextcloud's warning text colour. The icon is 18px, 2px down, and 10px before the text. The Nextcloud look is unchanged.
