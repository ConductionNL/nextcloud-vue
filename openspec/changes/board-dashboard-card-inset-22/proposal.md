# Proposal: board-dashboard-card-inset-22

## Why

51 of the Dq boards draw a card as `padding: 20px 22px` (2 draw 24px, 1 draws 22px 24px). The board look insets a
dashboard card 24px, so on every board dashboard the card title and its rows sat 2px further in than the board (COMPDIFF
r24/r25 header.titleInsetLeft 23 board vs 25 live, 34 cards on 8 boards: DqDashboard, DqMijnTeam, DqMijnWerk,
DqTermijnen, ...), and DqTermijnen's report tables were 6px narrower than drawn. Four dashboard rules wrote 24px by hand.

## What changes

`--cn-board-dashboard-card-inset` is 22px, and the record list, the in-cell card grid, record-list cards and saved views
on a dashboard card take the token instead of a literal 24px.

## Scope

src/css/look-board.css. No schema change.
