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

**A card is a container, and each thing you can do on it is its own control.**
The card carries the drag and nothing else. Opening it is an Open button that
announces which card it opens, and Move to is a select beside that button,
never inside it. So Enter and Space both open a card, because a native button
does that without being asked.

The card is deliberately not one big control. Giving it `role="button"` would
make the Move to select an interactive control inside a button, which takes
away the only way a keyboard user can move a card, and it would collapse every
field on the card into a single label. Gate 32 `semantic-controls` suggests
exactly that; `tests/a11y/CnBoardView.a11y.spec.js` holds the line, and axe
calls the suggestion `nested-interactive` when you try it.

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
| `dueRule` | `Object` | `null` | Marks late cards: `{ field, soonDays? }`. See below. |

## Late cards

Give the board a `dueRule` and it marks the cards that are late:

```vue
<CnBoardView
  :rows="rows"
  :status-field-schema="statusSchema"
  :card-fields="['title']"
  :due-rule="{ field: 'deadline', soonDays: 3 }" />
```

| The card's date | The card shows |
|---|---|
| before today | an edge in the error colour and the label "Overdue" |
| today, or within `soonDays` (default 3) | the label "Due soon" in the warning colour |
| later, or no date | nothing extra |

The label is text inside the card. The edge helps a sighted reader find the card, and the words are what a screen reader and a colour-blind reader get.

Days are whole calendar days in the reader's own timezone. A deadline of today is never overdue in the morning.

From a manifest, put the rule in the page's `board` block:

```json
"board": {
  "statusField": "status",
  "cardFields": ["identifier", "title", "requester"],
  "dueRule": { "field": "deadline", "soonDays": 3 }
}
```

The deciding is shared with the table's date cell (`utils/dateVariant.js`). `soonDays: 3` is shorthand for `variantWhen: [{ op: 'lt', value: 0, variant: 'error' }, { op: 'lte', value: 3, variant: 'warning' }]`. A rule may carry its own `variantWhen` list instead: `error` marks the card overdue and `warning` due soon.

Without a `dueRule` the cards render as before.

## Events

| Event | Payload | Description |
|---|---|---|
| `card-click` | `(row, event)` | A card was opened, by click or Enter. The second argument is the native event, for opening the card in a new tab on a ctrl/cmd/shift click. A middle click emits `card-aux-click` instead. |
| `card-aux-click` | `(row, event)` | A card was middle-clicked. The second argument is the native auxclick event, for opening the card in a new tab. |
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

## The board look (`look: "board"`)

With the app in the board look (`cnLook`) the board draws the screens' anatomy
(canon section 8); without it nothing here changes. The move contract and the
two gestures stay as defined above.

- **Columns.** A grid of `minmax(240px, 1fr)` with a 16px gap that scrolls
  sideways when the tracks do not fit; a column is a 12px panel with 12px
  padding. Four columns in a 1184px area are 284px each; six are 240px.
- **Column header.** An `h2` with a 10px dot, the label and a white count
  badge showing the column's total. The dot comes from `config.board.colorField`
  on the state, else the state's declared `color`, else the muted text colour.
  `config.board.sumField` adds a 13px grey sum line, formatted by
  `config.board.sumFormat` (or the field's `format`).
- **Card.** `config.board.card` names the roles; the card falls back to
  `cardFields` (first field the title, the rest the sub line).
- **No form controls at rest.** The title is the link that opens the card
  (middle click kept), a 34px "..." menu button holds "Move to" (every other
  column) and "Open in new tab", and the M key opens the same menu. Choosing a
  column runs the same transition as a drop. The card stays a `listitem`.
- **Cut columns.** `config.board.columnLimit` draws the first N cards and a
  dashed "Show N more" button; the badge keeps the total. With `paged` the
  button also emits `load-more` (`CnIndexPage` asks for the next page).

```json
"board": {
  "statusField": "status",
  "card": { "title": "title", "sub": ["identifier", "requester"], "pill": "type", "due": "deadline", "owner": "assignee" },
  "colorField": "statusColor",
  "sumField": "amount",
  "columnLimit": 8,
  "dueRule": { "field": "deadline", "soonDays": 3 }
}
```

`card.pillColors` (value to badge variant) colours the pill. `CnObjectKanban`
is not changed by this look.
## See also

- `utils/boardColumns.js` — the columns, and which card is in which.
- `utils/boardSwimlanes.js` — the second axis.
- `utils/boardTransition.js` — what a drop actually does.
- `CnIndexPage` — `config.board` and `viewModes` wire the mode.
