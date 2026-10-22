# Proposal: board-timeline-rows

## Why

COMPDIFF r22 measured the managed timeline entry on DqZaakHistorie ("Historie van de zaak") at 111.8px against the
board's 58px, its first line at 13.5px weight 700 against 15px weight 600, with no rail icon. The board draws each
entry as a rail row: a 34px circle on a 2px line, the event first at 15px, then the kind, author and moment as one
13px muted line, 6px above and 16px below. Live stacks a bold kind line, the message and a row of action buttons.

## What changes

In the board look only, for `CnTimelineManage` entries:

- the entry is a rail row: 48px in, a 34px circle at its start and a 2px line down to the next entry, 6px above and
  16px below, no rule under it;
- the message comes first at 15px weight 600 at its normal line height, also under a theme that sets paragraphs with
  `!important` (through the paragraph tokens);
- the kind, author and moment are one 13px muted line, separated by middle dots; the badges are pills at its end;
- the entry actions (Pin, the declared actions, Mark as answered) stay, placed over the row's end and shown on hover
  and keyboard focus, so they no longer add a line to every entry;
- a pinned entry tints its circle instead of drawing a left border.

The Nextcloud look is unchanged.
