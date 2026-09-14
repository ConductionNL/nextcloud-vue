# Design: object-list-widget-grouping-select-facet

## Component and surface

`CnObjectListWidget` (`src/components/CnObjectListWidget/CnObjectListWidget.vue`).
Kind: code. No new files — every seam lives in this one component, following
the same pattern `extend` / `rowActions` / `dropZone` used (#1090).

## What changes

### 1. `groupBy` / `groupLabel` — row grouping

`content.groupBy` (a row field path, dotted paths supported the same way a
column reads an `extend`-inlined reference) buckets the already-fetched,
already-faceted rows into `{ key, label, rows }` groups, in first-seen order
(the rows arrive server-sorted, so first-seen order preserves that global
order inside each bucket — equivalent to "sort within group" without a
second client-side sort pass). `content.groupLabel` names the field used for
the heading text; it defaults to the raw `groupBy` value.

A `$ref` group key that resolved to an object (an `extend`-inlined reference,
e.g. `groupBy: 'informatieobjecttype'`) groups by `.id`, not by the
stringified object — `String({...})` collapsing every group into one
`"[object Object]"` bucket was the first thing the mutation check for this
capability caught.

Template: `isGrouped` picks between the existing single-`CnDataTable` render
path and a new `v-for` over `groupedRows`, one heading (`<h4>`) + `CnDataTable`
per group. Every other prop (`columns`, `selectable`, `sortKey`/`sortOrder`,
row-actions slot) is threaded into both paths identically, so a grouped
widget behaves like N small ungrouped ones stacked under headings.

### 2. `selectable` + `bulkActions` — multi-select with bulk actions

`CnDataTable` already renders a checkbox column and computes select/select-all
arithmetic given `selectable` + `selectedIds` (`CnDataTable.vue:423-431`,
`:1247-1267`) — it was simply never wired from `CnObjectListWidget`. This
change adds `selectedIds` component state, passes `:selectable` /
`:selected-ids` through, and listens for `@select` (`onSelect` replaces the
array wholesale, matching how `CnDataTable` already computes it).

`content.bulkActions` is the same manifest action shape as `rowActions`,
mapped onto the identical `{label, icon, destructive, handler}` shape
(`mappedBulkActions`) so `CnRowActions`-style rendering logic is not
duplicated — the bulk bar renders its own plain buttons (matching the
widget's existing plain-HTML Add/View-all controls) rather than pulling in
`CnRowActions` for a non-per-row use.

Dispatch reuses `dispatch()` exactly as `runRowAction` does: a `handler`
bulk action receives the **selected row objects** (not just ids) appended to
`args` — so a registry function can read titles/fields without a second
fetch, mirroring how a row action receives its one row. An `open-modal` bulk
action receives `props.selectedIds`, mirroring how a drop hands over
`props.files`. The selection clears immediately after dispatch; the action
itself owns any success/error feedback and page refresh, same convention as
every other dispatched action in this component.

### 3. `sortable` — interactive sort

`CnDataTable` already emits a `sort` event
(`{key, order, keys}`, `CnDataTable.vue:1230-1245`) on a sortable header
click. `content.sortable` (boolean = every column, array = the listed keys)
fills in a `sortable: true` on `resolvedColumns` entries that did not
already declare their own — an explicit `sortable: false` on one column
still wins.

The fixed `content.sort` prop seeds new `localSort` component state
(`data() { localSort: { ...(this.content.sort || {}) } }`); `fetchRows` and
`sourceKey` both read `localSort`, not `content.sort`, so `onSort` — which
just overwrites `localSort` — flows into a refetch through the EXISTING
`sourceKey` watcher (no new fetch trigger needed). A `key: null` sort event
(the third click of a two-state header) goes back to unordered rather than
sticking on the last field.

### 4. `facet` — keyword-style filter

`content.facet: { field, label? }` computes `facetOptions` — distinct values
of that field across the currently loaded rows, flattening an array field
(the exact "keywords across the dossier" shape `collectKeywords` computes in
`dossierHelpers.js`) — and renders one chip per value. Selecting chips
narrows `facetedRows` to rows whose field value intersects the selection
(`some`, not `every` — a row satisfies the filter on ANY selected value, the
same semantics `filterGroupsByKeywords` uses; the mutation check for this
capability is built specifically to distinguish `some` from `every`, since a
row with exactly one keyword cannot).

This is client-side over the currently loaded page, same limitation the rest
of the widget's row set already has (`visibleRows` is a client-side slice of
one fetched page). A separate empty state (`showNoFacetMatchState`) covers
"rows loaded, but none match the active facet" distinctly from "no rows at
all," matching `DossierTab`'s own "No documents match this keyword" /
"No documents yet" split.

### 5. Click-to-upload button (rides `dropZone`)

No new action type. `showUploadButton` is true whenever a `dropZone` is
declared and `content.upload !== false`; the button opens a native file
picker whose selection dispatches the SAME `dropZoneAction`, through the
same `dispatch()` call a drop already makes — the drop-vs-click distinction
is only in how the `File[]` array is obtained. A host that wants drag-only
(no button) sets `content.upload: false`.

## Alternatives considered

- **A dropdown for interactive sort**, matching `DossierTab`'s own UI:
  rejected. `CnDataTable` already has column-header click-to-sort wired end
  to end and unit-tested; a dropdown would need its own `sortOptions` config
  redundant with the already-declared `columns`, for a UI difference that
  does not change the underlying capability (the user picks a field and a
  direction) Ruben's decision named.
- **A `content.upload` action distinct from `dropZone`**: rejected. Every
  known upload target for this widget (a case's Documents tab) wants both
  drag-and-drop and click-to-pick to land on the identical handler; a second
  action key would let the two affordances declare different, silently
  divergent handlers.
- **Server-side faceting** (an aggregation endpoint call): rejected for this
  change. `DossierTab`'s own keyword filter is already client-side over an
  unpaginated `/dossier` fetch; matching that behavior needs no new backend
  contract, and a case's document count is bounded enough that client-side
  faceting over one page (with `limit` set generously) is the direct
  translation, not a new problem to solve.
- **A live count in the tab title**: out of scope — see proposal.md's
  "Backward compatibility" section. That is `CnTabs`/manifest-schema
  territory, not this widget's render surface.
