# Proposal: board-detail-header-row

## Why

The board draws a case's header buttons on the title row, level with the title (DqZaak: both at 96). Live the title
block took the row from a 320px basis, the title and its follow control beside it, so on a 960px header (a 1280px
window) the buttons centred against a two-line title block (at 107), and on a narrower header they dropped to a row
of their own (at 132 to 136).

## What changes

In the board look the detail header aligns its row to the top, and the title block takes what the buttons leave from
a zero basis, down to 16rem; only below that do the buttons wrap. Measured live with the rule applied: the buttons at
the title's top from a 1600px down to a 1180px window. Button styling stays with comp/CnDetailPage-headerActions.
