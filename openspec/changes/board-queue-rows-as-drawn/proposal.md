# Proposal: board-queue-rows-as-drawn

## Why

r34 DqTeamwachtrij: the list card stood 78px shorter than the board's (pager y -79) and the "Werkvoorraad per zaaktype"
card 48px lower. The board draws each queue row 12px 18px with 14px between the cells and lets the title and its meta
line ("2026-4864 · Marja Verbeek · Ontvangen · prioriteit hoog") wrap in the title column at their normal leading: 75px
rows. Live drew 59px rows with both lines cut off by an ellipsis. In "Team vandaag" the name and availability line sat on
the body's 1.5 line height, 8px a person more than the board.

## What changes

- In the board look a list view row (CnObjectRow inside `.cn-index-page__main--list`) pads 12px 18px, spaces its cells
  14px, draws the title 15px, and lets title and meta wrap at their normal leading, 2px apart.
- CnTeamWorkloadWidget's name and availability line sit at their normal leading in the board look.

## Scope

Board look only. The column widths are the app's (`listConfig.leading.width`, trailing widths).
