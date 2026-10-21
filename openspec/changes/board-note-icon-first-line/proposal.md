# Proposal: board-note-icon-first-line

## Why

COMPDIFF r20 measured the info note in DqBerichtVersturen, DqDocumentGenereren and DqZaakSamenwerken with its text 44px
in and 14px down, where the boards put the icon at 14px on the first line and the text 11px down; DqZaaktypeOverzicht's
record list notice showed the same. NcNoteCard's icon wrapper stretches to the note's height and centres its 20px icon,
so on a note of two lines the icon sat beside the second line. The boards draw 17 notes with one geometry: 10px 14px of
padding, radius 10, an 18px icon on the first line, 13px text in a dialog and 14px on a page. The board look drew 12px
14px and radius 8.

## What changes

In the board look the info note takes 10px 14px of padding and radius 10, its icon is 18px and sits on the first line,
and in a board dialog its text is 13px. A record list notice's icon sits on the first line too. The Nextcloud look is
unchanged.
