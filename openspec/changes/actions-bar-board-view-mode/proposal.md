# Proposal: actions-bar-board-view-mode

## Why

Board PqPipeline draws the pipeline page's toolbar as every index board does: Filter, the view switch Tabel / Kaarten / Bord / Map with Bord pressed, search and the active filters. The page is itself the board (the leads by stage), but CnActionsBar only knew `board` as a link to another page, so a board page could not use the shared toolbar.

## What changes

CnActionsBar accepts `board` in `viewMode` and `availableViewModes`. Under the board look it is an in-place segment: a button, pressed while the page shows the board.

## Scope

Two prop validators and their docs. The board segment was already defined for the board look; nothing else changes.
