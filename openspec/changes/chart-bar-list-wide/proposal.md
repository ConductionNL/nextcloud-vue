# A wide bar list

## Why
The boards draw two bar lists. DqDashboard "Zaken per status" is the compact one (170px labels, 14px bars 10px apart), which is the library default. DqTermijnen "Op tijd beslist per zaaktype" and DqDoorlooptijd "Binnen de norm per zaaktype" draw a wide share list: 220px labels, a 90px value column, 12px bars 12px apart, 12px under the header. r36: rows 27 apart instead of 29, the list 77 from the card top instead of 73, card 222.9 vs 227.

## What changes
- CnChartWidget `barListWide` (bar-list), handed through by CnDashboardPage: the wide grid, gap and bar.
- look-board.css: on a board dashboard card the wide list's chart body has no 4px start.
- The default list is unchanged.
