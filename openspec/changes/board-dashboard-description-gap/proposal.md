# Proposal: board-dashboard-description-gap

## Why

The board dashboard header stacks its rows 6px apart (board-dashboard-header-row-gap), and the board dashboard
description kept its own 6px top margin on top of that. The line under the title stood 19px below the title's text
against the board's 13 (COMPDIFF r24 DqDashboard, DqMijnWerk, DqMijnTeam `subtitle.gapBelowTitle 13 vs 19`).

## What changes

In the board look, when the title row holds buttons (and so is 40px tall), the dashboard description has no top
margin; the row gap alone spaces it. Without buttons it keeps its margin.

## Scope

Board-only, `look-board.css`. The Nextcloud look keeps the description's own margin.
