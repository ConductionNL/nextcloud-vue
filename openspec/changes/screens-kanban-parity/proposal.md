---
kind: code
---

# Proposal: screens-kanban-parity

## Summary

The screens draw a board as the index list's toolbar on top and, under it,
columns of `minmax(240px, 1fr)` with a 16px gap that scroll sideways when
they do not fit. A column is a `#eceef1` panel with radius 12 and 12px
padding. Its header holds a coloured dot, the title in 15px bold and a white
count badge, with an optional sum line under it. A card is white, radius 10,
padding 14, and reads: the title (15px bold), a sub line (13px grey), a
status pill, and a footer above a hairline with the due date left and the
owner's avatar right. A late card gets a red edge. A column that is cut
ends in a dashed "Show N more" button.

CnBoardView (from `status-board-and-date-axis`) renders the columns the
schema declares and moves cards through the host's transition, with a
keyboard path on every card. It is right about behaviour and far from the
board in look:

- columns are a flex row of fixed 260px with a 12px gap and 8px padding on
  `--color-background-hover`;
- the count is plain grey text, and there is no dot and no sum;
- a card is a stack of plain field lines with the due label first, an
  "Open" text button and a visible "Move to" select on every card;
- there is no title, sub line, pill, footer or avatar slot;
- a long column renders every loaded card, with no cut and no "Show more".

CnObjectKanban has the same gaps at 280px.

This change adds the board anatomy behind the board look (`cnLook`, from
`screens-dialog-parity`) and one opt-in key per piece of anatomy. The
transition contract and the two gestures stay exactly as
`board-card-role-and-keyboard` defines them.

1. The column grid: `minmax(240px, 1fr)`, gap 16, padding 12, sideways
   scroll.
2. The column header: dot (`config.board.colorField` or the lifecycle
   state's colour), title, white count badge, optional sum line
   (`config.board.sumField`).
3. The card anatomy from field roles (`config.board.card`: title, sub,
   pill, due, owner).
4. The card opens on its title link; the move select becomes a "Move"
   menu button on the card (and the M key), so the card shows no form
   controls at rest.
5. A column cut (`config.board.columnLimit`) with a dashed "Show N more".
6. The board's primary action sits in the page header, not in a column.

## Reference screens

- `dossiq/DqWerkbord` (four columns, late card, move menu):
  https://identity.conduction.nl/screens/board?id=dossiq/DqWerkbord
- `pipelinq/LijstBord` (questions and reports as a board):
  https://identity.conduction.nl/screens/board?id=pipelinq/LijstBord
- `warmtepompacademie/LqBord` (course days per status):
  https://identity.conduction.nl/screens/board?id=warmtepompacademie/LqBord
- `esdoornveen/LqBord` (placements per phase):
  https://identity.conduction.nl/screens/board?id=esdoornveen/LqBord

The two school boards draw their columns at `minmax(210px)` and
`minmax(250px)`. That is a drift on the boards, not a second value: the
component follows the canon's 240px and the school boards should be
redrawn to it.

Canon: section 8 of `UNIFORM-canon.md`. The mini boards on
`decidiq/DcOverleg` and `decidiq/DcDashboard` keep their own anatomy and
are out of scope.

## Builds on

- `status-board-and-date-axis` (the board view mode, columns from the
  status field, swimlanes, the transition on move).
- `board-card-role-and-keyboard` (the card is a container, actions are
  controls, the board's accessibility spec). Every requirement here keeps
  that contract.
- `index-page` and `screens-dialog-parity` (this PR) for `cnLook`. The
  toolbar on top is the index list's and belongs to the list family, not
  to this change.

## Affected consumers

dossiq (`#Cases` board), pipelinq (questions and leads), learniq (rosters
and placements), buildiq, and any app with `viewModes` including `board`.

## Backward compatibility

Additive. The new `config.board` keys are optional, the board look is
opt-in, and the Nextcloud look keeps the fixed 260px columns and the field
lines. The keyboard move stays available in both looks.

## Theming

Column ground `--color-background-dark`, cards `--color-main-background`,
badge on `--color-main-background`, late edge `--color-error`.
