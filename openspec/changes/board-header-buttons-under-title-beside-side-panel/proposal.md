# Proposal: board-header-buttons-under-title-beside-side-panel

## Why

Board DqZakenSorteren (side panel open) draws the header buttons on their own row under the title (title at 96, buttons
at 142, count line at 197). Live kept them beside the title, which squeezed the count line onto two lines.

## What changes

CnIndexPage marks its root `cn-index-page--sidebar-open` while its side panel is open. In the board look the header
buttons then take the row under the title (6px above, 3px below), the breadcrumb and the count line follow. Probed live
by injection with the panel open: title 96, buttons 142, count line 197. No schema change.
