# Proposal: board-table-fits-beside-side-panel

## Why

r30 (26 Oct): beside the open side panel, DqZakenSorteren, DqFilterBeheren and DqFilterInMenu draw the case table inside the 760px column with wrapping titles. On :8080 the table kept its configured column widths (328/179/171/178/141px plus selection and actions): 1123px in a 758px scroll box that scrolls sideways.

## What changes

In the board look, while the side panel is open, CnIndexPage's table takes its column's width: auto layout, configured column widths and maxima set aside, cells wrap (a long word hyphenated, `hyphens: auto`, the page being lang nl; an unbreakable token such as an id breaks anywhere as the last resort), a status pill wraps before the row scrolls, and each header keeps its label, sort chevron and filter on one line. Probed live by injection: table 758 in a 758 box, no sideways scroll, headers whole, titles and names wrapping. With the panel closed nothing changes. No schema change.
