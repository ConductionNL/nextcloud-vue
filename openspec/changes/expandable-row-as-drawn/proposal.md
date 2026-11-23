# Proposal: expandable-row-as-drawn

## Why

pl3 PqPipelines measured the expandable pipeline rows against the board: Bewerken was 34px without the pencil (board 40px with it), the row menu 34px (board 40px), the title 19px after the toggle (board 14px: Nextcloud's core margin on a bare button added 3px), the order number 13/600 in the main ink (board 12/700 in the soft ink) and "Fase toevoegen" a white bordered button (board a light primary pill).

## What changes

- CnExpandableRow: a header button takes `icon`, a CnIcon name drawn before its label. Schema: `expandableRows.buttons[].icon`.
- Board look (look-board-index.css): toggle 14px before the title with no margin, its open chevron in the light primary ink, the open head 14px at the bottom; header buttons and the row menu 40px; the order number 12/700 in the soft ink; the footer action a 34px light primary pill.
