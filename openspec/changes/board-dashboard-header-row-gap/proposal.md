# Proposal: board-dashboard-header-row-gap

## Why

The board draws a page header as rows 6px apart: the title row, as tall as its 40px buttons, then the crumb or
description. That puts the line under the title about 13px below the title's text (DqDagAfsluiten, DqCatalogus). The
board dashboard header's grid set no row gap, so the line sat 7px below (COMPDIFF r21 `subtitle.gapBelowTitle 13>7`,
handed over by NCV-CONTAINERS).

## What changes

The board dashboard header's grid stacks its rows 6px apart.

## Scope

Board-only, `look-board.css`.
