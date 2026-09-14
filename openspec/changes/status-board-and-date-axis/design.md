# Design: status board and date axis

## Component and surface

`CnIndexPage` (`src/components/CnIndexPage/`), `CnActionsBar`,
`useListView`, and two new presentation components, `CnBoardView` and
`CnDateAxisView`.

Kind: code, plus manifest keys consumed as config by apps.

## D1. A view mode, not a page type

`cnindexpage-map-viewmode` added `map` as a third `viewMode` value, gated
by `config.viewModes`, rendering the current filtered result set with no
second fetch path. The board and the date axis follow it exactly. A board
that were its own page would need its own filters, its own search, its
own sidebar and its own detail navigation, which is the duplication that
change removed.

```json
"config": {
  "viewModes": ["table", "cards", "board"],
  "board": { "statusField": "status", "swimlaneField": "afdeling", "cardFields": ["zaaknummer", "aanvrager"] },
  "dateAxis": { "startField": "startDatum", "endField": "fatalDatum", "laneField": "behandelaar" }
}
```

## D2. Columns come from the field, not from the page

The board reads its columns from the status field's enum or its declared
lifecycle, in the schema's order. A page repeating the list of statuses
would be a second source of truth that goes stale the first time somebody
adds a stage. A status the schema hides stays hidden here too.

## D3. A drag is a transition, not a write

Dropping a card asks the host to run the transition from the card's
current status to the column's. The component never writes the field
itself. Two reasons. A lifecycle has guards, and a guard that only the
server can evaluate must be the thing that decides. And a transition is
what gets audited; a field write is not.

A refused drop returns the card to its column and renders the refusal the
guard gave, in the guard's own words. That path is the one the tests
prove, because a card that snaps back with no message is the failure mode
every board has.

## D4. The second axis is rows, and it is optional

`swimlaneField` groups the cards into rows while the columns stay the
stages. Absent, one row and no headers. GitLab charges for this and
Kanboard does not, which says nothing about the cost and everything about
the packaging; the mechanism is one more group-by over rows the list
already holds.

## D5. The date axis is a reading, not a planner

Work with a start and an end renders on a time scale, one lane per
`laneField` value, overlaps visible. It does not schedule, it does not
drag to reschedule and it does not compute a critical path. The batch 1
objection to a Gantt was that four hundred parallel statutory terms read
badly, and it is a fair objection: the answer is a lane per handler and a
window the user sets, not a chart of everything.

Rows without both dates are collected under an "unplanned" lane rather
than dropped, because silently missing work is worse than a visible pile
of it.

## D6. Each mode keeps its own filter

A user filtering on the board, switching to the table and finding the
table filtered has lost their place. Filters are held per mode within the
view. The view's own criteria are shared, because that is what the view
is.

## D7. What the board does at scale

A board is not a list. Four hundred cards in one column is not a screen
anybody reads, and fetching them all to render it is not free. Each
column pages, shows its total from the count the list already asked for,
and loads more as the column scrolls. A count that the page cannot
confirm is labelled as the loaded count, the same rule as grouping in
`saved-view-tree-and-labels`.

## Risks

- **A schema with no status field.** The board is offered only when
  `board.statusField` names a field that exists and carries an enum or a
  lifecycle. Otherwise the mode is not offered and the validator says so
  at build time, not at render time.
- **Drag and a keyboard.** Drag alone is not operable, so every column
  offers Move to on the card menu and the card is reachable by keyboard.
  WCAG 2.2 AA, and it is also how a handler doing sixty cases a day
  actually works.
- **A drag while somebody else moved the card.** The transition is run
  against the row's current status; a mismatch is refused by the host and
  the board re-reads the row rather than forcing the move.
- **Two boards, one in dossiq and one here.** dossiq keeps
  `WorkflowBoard.vue` until it consumes this one. The change closes when
  dossiq's board is the shared component, and the tasks name that
  handover.
