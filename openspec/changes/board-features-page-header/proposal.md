# board-features-page-header

## Why

The Features and roadmap page in the board look (board dossiq/DqFunctionaliteiten) stood 16px further in and 24px
lower than every other board page: the view kept its own 24px 16px padding around the board, which draws its own. Its
"Documentatie" button was a 34px Nextcloud secondary button instead of the board's header button, the meta line under
the title was 15px where the board draws 14px muted, the status options sat 5px apart (Nextcloud's core sheet gives
every plain button a 3px margin) where the board draws 2px with the options at rest in the softer ink, and a group
title kept Nextcloud's 1.5 line height.

## What changes

In the board look:

- The view adds no padding around the board.
- The board's header buttons take the board header button rules.
- The meta line is 14px muted; the segmented status options have no margin and the ones at rest use
  `--cn-board-text-soft`; a group title in the rows layout uses the normal line height.
