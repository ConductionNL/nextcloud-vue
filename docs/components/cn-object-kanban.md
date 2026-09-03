---
sidebar_position: 45
---

import Playground from '@site/src/components/Playground'
import GeneratedRef from './_generated/CnObjectKanban.md'

# CnObjectKanban

Kanban board over a schema property's distinct values — one column per value
of `groupByField`, cards paginated per column ("load more"), and drag-to-move
wired to the host's own object write (there is deliberately no bespoke "move
card" endpoint).

**Wraps**: CnCellRenderer, [vuedraggable](https://github.com/SortableJS/vue.draggable.next)

## Try it

<Playground component="CnObjectKanban" />

## Two rendering modes

- **Pre-built columns** — pass `columns`, the shape returned by OpenRegister's
  `GET /api/views/{id}/kanban` (`[{ value, cards, total, limit, offset }]`).
  The host owns pagination: clicking "load more" only emits `load-more`, and
  the host re-fetches and passes updated `columns`.
- **Flat objects** — pass `objects` + `groupByField` (optionally `columnOrder`
  and `schema`). The component derives and paginates columns itself, using
  the same precedence as the backend
  (`ViewPresentationService::deriveColumnValues()`): explicit `columnOrder` >
  the property's schema `enum` order > distinct values discovered in
  `objects`.

## Props

<GeneratedRef />

Besides `objects`/`columns`/`groupByField`/`columnOrder`/`cardFields`/`schema`
above: `loading` shows the board-level loading state; `loadingColumns` marks
which column values are currently fetching a "load more" page (per-column
spinner); `pageSize` sets how many cards a locally-derived column shows
before "load more"; `rowKey` is the object property used as each card's
identity (defaults to `id`).

## Drag-to-move contract

Dragging a card to another column does not write anything by itself. The
component:

1. Applies the move optimistically (the card renders in the destination
   column immediately).
2. Emits `move` with `{ object, groupByField, fromValue, toValue }`.
3. Waits for the host to call back:
   - `resolveMove(objectId)` — the write succeeded; clears the pending state.
   - `rejectMove(objectId, reason)` — the write was rejected (e.g. an illegal
     `x-openregister-lifecycle` transition); the card snaps back to its
     origin column and `move-rejected` fires with the reason to surface.

```vue
<CnObjectKanban
  ref="kanban"
  :objects="objects"
  group-by-field="status"
  :column-order="['todo', 'doing', 'done']"
  :card-fields="['title', 'assignee']"
  :schema="schema"
  @move="onMove"
  @move-rejected="onMoveRejected"
  @load-more="fetchMoreCards" />
```

```js static
async onMove({ object, groupByField, toValue }) {
  try {
    await patchObject(object.id, { [groupByField]: toValue })
    // Optional — clears the pending style sooner than the next refetch:
    this.$refs.kanban.resolveMove(object.id)
  } catch (e) {
    this.$refs.kanban.rejectMove(object.id, e.message)
  }
},
onMoveRejected({ reason }) {
  showError(reason)
},
```

## Slots

- `#empty` — custom empty state when there are no columns.
- `#column-header="{ column }"` — override a column's header.
- `#card="{ object, column }"` — fully replace the default card rendering
  (the default renders a title plus each configured `cardFields` entry via
  `CnCellRenderer`).
