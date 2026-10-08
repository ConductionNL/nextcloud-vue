# Design: screens-kanban-parity

## Component and surface

`CnBoardView` (`src/components/CnBoardView/`), the board part of
`CnIndexPage`'s config, `CnObjectKanban` (same tokens only), new
`src/css/board.css`. Manifest: `config.board.card`, `colorField`,
`sumField`, `columnLimit`.

## D1. Field roles, not field lists

`config.board.cardFields` is a list of fields printed one per line. The
board card has roles: one title, one sub line, one pill, a due date and an
owner. A list cannot say which field is the title. So the board look reads
`config.board.card`:

```json
"board": {
  "statusField": "status",
  "card": { "title": "title", "sub": ["identifier", "requester"], "pill": "type", "due": "deadline", "owner": "assignee" },
  "colorField": "statusColor",
  "sumField": "amount",
  "columnLimit": 8
}
```

`sub` joins its fields with a middle dot. When `card` is missing the board
look falls back to `cardFields`: the first field is the title, the rest form
the sub line. The Nextcloud look ignores `card`.

## D2. The move stays, the select goes

`board-card-role-and-keyboard` requires a keyboard path for every move. The
visible select on each card is that path today, and it is what makes the
card look like a form. The board draws a move menu instead (DqWerkbord: a
context menu "Move, for <card>" listing the other columns, opened by right
click, by the M key on a focused card, or by a "Move" item in the card's
menu button). In the board look:

- the card's title is the link that opens it (replacing the "Open" button,
  same handler, middle click kept);
- a 34px "..." menu button at the card's top right holds "Move to" with
  the columns as items, and "Open in new tab";
- M on a focused card opens the same menu.

The card stays a container (`role="listitem"`), never a button. The axe
checks in `tests/a11y/CnBoardView.a11y.spec.js` run in both looks.

## D3. The cut is per column, after load

`columnLimit` cuts what is drawn, not what is fetched. The column shows its
first N cards and a dashed button "Show N more" that reveals the rest; the
count badge always shows the column's total. With server paging
(`paged: true`) the button loads the next page for that column instead.
