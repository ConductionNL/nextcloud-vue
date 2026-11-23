# Proposal: board-headed-note

## Why

The boards draw two sizes of note. A plain hint is 10px 14px with an 18px icon, 13px in a dialog. A note with a bold
heading is the larger box: 14px 16px, a 20px icon 12px before 14px text, in a dialog too (DqBesluit "Publiceren doet
u daarna", DqArchiveren "Daarna alleen lezen"). The board look drew every info note the small way, so COMPDIFF r22
measured the headed note's title 42px in, where the board has 48.

## What changes

In the board look an info note with a heading takes 14px 16px of padding, a 12px gap, a 20px icon and 14px text, also
in a board dialog. A note without a heading is unchanged.
