# Proposal: board-task-rows-as-drawn

## Why

COMPDIFF r33, DqMijnWerk "Mijn taken": the board wraps a task's title and subject in its 320px card, sets the subject and
due line at the font's normal line height 4px under the title, and ends 20px under the last row (a 555px card). Live cut
both off with an ellipsis on one line at 1.5 leading and ended 10px under the last row (447px).

## What changes

In the board look, a task list with the subject/due line wraps titles and subjects, sets that line at normal leading 4px
under the title, and pads 20px under the list.
