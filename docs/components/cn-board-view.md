---
title: CnBoardView
---

# CnBoardView

The index page's rows as a board: one column per stage of a status field.
Offered as the `board` view mode when the page declares `config.board` and
lists `board` in `viewModes`.

## The columns are the schema's, not the data's

`buildBoardColumns` reads the status field's `enum` or its lifecycle `states`
and renders them in the schema's order. A board built from the values present
in the loaded rows would lose the stage nothing is in — which is exactly the
one you drag a card into — and would reorder itself as work moved, because the
order would follow the data rather than the process.

A stage the schema hides is not a column: rendering it invites somebody to drag
work into a dead end. The cards sitting in one are real work, so they get a
named "Elsewhere" column, and that column appears only when it has something
in it.

A status field with neither an enum nor lifecycle states cannot back a board.
The view says so on screen rather than drawing empty columns, because the
manifest cannot know: the stages live in the register schema, not in the
manifest.

## A move goes through the host's transition

`runBoardDrop` owns the contract and is tested on its own. The rule:

**The board never writes the status field.** Writing it directly would skip
every guard, side effect and audit entry the transition carries, and the board
would become a way to move a case past a rule the case page enforces. A board
is a nicer way to do a thing, never a way to do a different thing.

**A refusal returns the card and shows the guard's own sentence.** A card left
in the new column is a lie about where the work is, and it survives a refresh
as a surprise. The component uses its own wording only when the guard supplied
none, so the two are never confused.

**A card somebody else moved is re-read, not forced.** Two people on one board
is the ordinary case. The card comes back as it now is, so the board re-renders
the truth rather than restoring the dragger's stale copy.

**There are two gestures, always.** A board whose only move is a drag is a
board a keyboard user cannot use, and "drag the card" is not an instruction
anybody can follow with a keyboard. Move to on the card runs the identical
call.

With no `runTransition` the board is read-only: no drag, no Move to. A gesture
that cannot do anything is worse than no gesture.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `rows` | `Array` | `[]` | The rows the list holds. |
| `statusFieldSchema` | `Object` | `null` | The status field's schema: its `enum` or its lifecycle `states`. |
| `statusField` | `String` | `'status'` | The property a row's status lives on. |
| `cardFields` | `Array` | `[]` | The fields a card shows. Keep it short: a card is scanned, not read. |
| `swimlaneField` | `String` | `''` | A second field to group the board into rows by. |
| `rowKey` | `String` | `'id'` | The row key. |
| `runTransition` | `Function` | `null` | `({ card, toKey }) => Promise`. The only way the status changes. |
| `reread` | `Function` | `null` | `(card) => Promise<object>`, to check the card has not moved under the dragger. |
| `paged` | `Boolean` | `false` | Whether the counts are of one page. |

## Events

| Event | Payload | Description |
|---|---|---|
| `card-click` | row | A card was opened. |
| `moved` | `{ card, toKey }` | A card moved through the transition. |
| `refused` | `{ card, message }` | The transition refused, with the guard's words. |
| `stale` | `{ card }` | The card had already moved; the payload is it as it now is. |

## Swimlanes

`swimlaneField` groups the same cards into rows while the columns stay the
stages. Every lane carries every column, empty or not: a lane with only its own
stages would put the same stage at a different horizontal position on each row
and the board would stop reading as a board.

Cards with no value for the field get one named row, and it goes last. Grouping
by handler and hiding the unassigned work turns a board into a picture of what
is already somebody's problem.

A collapsed lane is remembered for as long as the reader is on the view and
deliberately not persisted: a lane somebody forgot they collapsed is work that
has gone missing for them.

## See also

- `utils/boardColumns.js` — the columns, and which card is in which.
- `utils/boardSwimlanes.js` — the second axis.
- `utils/boardTransition.js` — what a drop actually does.
- `CnIndexPage` — `config.board` and `viewModes` wire the mode.
