---
sidebar_position: 5
---

import Playground from '@site/src/components/Playground'
import GeneratedRef from './_generated/CnDataTable.md'

# CnDataTable

Sortable data table with row selection, loading states, and schema-driven column generation. Supports dot notation for nested values (e.g., `address.city`).

**Wraps**: NcLoadingIcon, NcCheckboxRadioSwitch, CnCellRenderer

## Try it

<Playground component="CnDataTable" />

![CnDataTable showing sortable columns, checkboxes, and row action buttons](/img/screenshots/cn-data-table.png)

## Anatomy

```
+--+------+----------↑---------+----------+----------+---------+----------------+
|  | sel. |  Column A ▲        | Column B | Column C | Column D| Actions header |
+--+------+--------------------+----------+----------+---------+----------------+
|☐ | 👤   | Alice van den Berg | Dept     | email@.. | Active  |⋮               |
|☐ | 👤   | Bob Jansen         | Dept     | email@.. | Pending |⋮               |
|☐ | 👤   | Carol Smit         | Dept     | email@.. | Active  |⋮               |
+--+------+--------------------+----------+----------+---------+----------------+
   ↑  ↑          ↑                                      ↑       ↑
   |  avatar   cell value                            badge    row actions
   checkbox                                          renderer
```

| Region | Description |
|--------|-------------|
| **Select-all checkbox** | Checks/unchecks all rows on the current page |
| **Column headers** | A sortable header holds a sort button: a pale chevron while unsorted, a dark chevron pointing up (ascending) or down (descending) once sorted. Clicking cycles ascending, descending, no sort |
| **Avatar / icon** | Auto-generated from the row's name field via CnCellRenderer |
| **Cell value** | Type-aware rendering: email links, dates, booleans, status badges |
| **Row actions** | Per-row `⋮` menu — rendered via the `#row-actions` slot |
| **Actions header** | Slot above actions row — rendered via the `#actions-header` slot (only renders when row actions exist) |
| **Loading overlay** | Spinner centered over the table body while `loading` is true |
| **Empty state** | "No items found" message (or `#empty` slot) when rows array is empty |

## Usage

```vue
<CnDataTable
  :schema="schema"
  :rows="objects"
  :sort-key="sortKey"
  :sort-order="sortOrder"
  :selectable="true"
  :selected-ids="selected"
  @sort="onSort"
  @select="onSelect"
  @row-click="onRowClick">
  <template #row-actions="{ row }">
    <CnRowActions :actions="rowActions" :row="row" @action="onAction" />
  </template>
</CnDataTable>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `schema` | Object | `null` | Schema object for auto-generating columns from its `properties` map |
| `columns` | Array | `[]` | Column definitions: `[{ key, label, sortable?, width?, align?, class?, cellClass?, formatter?, formatterOptions?, widget?, widgetProps?, aggregate? }]`. `formatter`/`widget`/`widgetProps` resolve against the app's `cnFormatters`/`cnCellWidgets` registries (provided by `CnAppRoot`); `formatterOptions` is passed as the formatter's fourth argument (e.g. `{ currency: 'USD' }` for the built-in `currency` formatter, or the `{ negative, zero, positive }` phrases for `conditionalPhrase`) — see [migrating-to-manifest → Column formatters / Column widgets](../migrating-to-manifest.md#column-formatters). `aggregate` (`{ register?, schema, op:"count", where }`) renders the cell as a count of related OpenRegister objects (one `_limit=0` request per row; `@self.<path>` in `where` interpolated per-row; `…` while loading, `—` on failure) — see [migrating-to-manifest → Aggregate columns](../migrating-to-manifest.md#aggregate-columns). The `#column-{key}` scoped slot still overrides everything. |
| `rowIcon` | String \| Function | `null` | Optional leading icon at the start of every row. A static MDI icon name (PascalCase, e.g. `'FileDocumentOutline'`) applied to all rows, or `(row) => iconName` to vary it per row. Resolved through the shared `CnIcon` registry. Unset = no icon column. |
| `columnOverrides` | Object | `{}` | Per-column overrides applied on top of schema-generated columns; keyed by column key |
| `excludeColumns` | Array | `[]` | Column keys to hide when using schema auto-generation |
| `includeColumns` | Array | `null` | Whitelist of column keys to show; all others hidden (takes precedence over `excludeColumns`) |
| `rows` | Array | `[]` | Array of row data objects to display |
| `loading` | Boolean | `false` | Shows a loading spinner overlay while `true` |
| `loadingText` | String | `'Loading...'` | Accessible label for the loading spinner |
| `sortKey` | String | `null` | Currently sorted column key; controls the direction chevron. `null` means no column is actively sorted. |
| `sortOrder` | String | `'asc'` | Current sort direction — `'asc'`, `'desc'`, or `null` (no sort) |
| `sortKeys` | Array | `[]` | Ordered multi-column ("shift+click") sort key list, `[{ key, order }, …]` (0–3 entries). When non-empty it takes precedence over `sortKey`/`sortOrder`; a single-key list is single-sort's behavior unchanged. Shift+click a sortable header to append/cycle a secondary or tertiary key. A numbered priority badge marks each sorted column only when two or more rendered, sortable columns are sorted; a key whose column is not rendered or not sortable (such as a `_uuid` tie-break) still sorts, but is not counted or numbered, and `aria-sort` goes to the first sort key whose column is rendered and sortable. |
| `selectable` | Boolean | `false` | Enables the checkbox column for multi-row selection |
| `rowClickToView` | Boolean | `false` | When true, a row-body click emits `row-click` (for navigation) even while `selectable` — selection then happens only via the checkbox column ("click row = open, tick box = select") |
| `selectedIds` | Array | `[]` | Array of currently selected row IDs (controlled) |
| `rowKey` | String | `'id'` | Property name used as the unique row identifier |
| `emptyText` | String | `'No items found'` | Message shown when `rows` is empty and no `#empty` slot is provided |
| `lensReasonTexts` | Object \| null | `null` | App wording for an unavailable personal lens in self-fetch mode, keyed `<lens>.<reason>` or `<reason>`. When the response reports `@self.lenses.<lens>.available: false` (openregister#4514) the empty row says why instead of `emptyText`. |
| `rowClass` | Function | `null` | Callback `(row) => cssClass` to add dynamic CSS classes to rows |
| `cellClass` | Function | `null` | Callback `(row, col) => cssClass` to add dynamic CSS classes to individual data cells |
| `scrollable` | Boolean | `false` | Enables horizontal scrolling for wide tables |
| `selectAllLabel` | String | `'Select all rows'` | Accessible name (`aria-label`) for the select-all checkbox in the header row, so screen readers announce a named control (WCAG 4.1.2) |
| `selectRowLabel` | String | `'Select row'` | Accessible name (`aria-label`) for each per-row select checkbox, so screen readers announce a named control (WCAG 4.1.2) |
| `rowTitle` | String | `'link'` | Board look only. `link` underlines the title column's title; `plain` draws it as 15px bold text without an underline over a 13px muted secondary line (the PqTickets board). The row stays clickable. |
| `hideHeader` | Boolean | `false` | Hide the column-header row (`<thead>`). Useful for compact dashboard list widgets that want a plain bordered-row list without column labels. |
| `pinnedCount` | Number | `0` | How many data columns are pinned to the start of the table. They, and the selection and icon columns, stay in view when the table scrolls sideways. |
| `fixedLayout` | Boolean | `false` | Switch to `table-layout: fixed`, making each column's `width` authoritative instead of a hint the browser may override from cell content. Opt in when content would otherwise dictate the layout: a long unbreakable value (a PHP FQCN, a UUID) widens its own column under the default auto layout and can paint past the cell box into its neighbour, while a column left unsized soaks up all remaining width. Cells break long words rather than overflowing. Columns with no `width` share what is left, so size every column when you want exact control — percentages summing to 100 are the easiest to reason about. |
| `rowIndicators` | Array | `[]` | State indicators the page declares for its rows. Each entry is `{ id, field, equals?, in?, icon, text, tooltip? }`: `field` is a dotted path on the row, the condition is `equals`, `in`, or plain truthiness when neither is given, `icon` is a CnIcon name, and `text` is the text alternative. An entry without `text` does not render, because an icon with no text is colour and shape alone (WCAG 2.2 SC 1.4.1). The page decides which indicators exist: a record cannot add one the page has not declared, and a page declaring none renders its rows exactly as before. |
| `rowIndicatorCap` | Number | `3` | How many declared indicators render on the row itself. The rest stay available from `indicatorsFor(row).overflow`, for the row menu. |
| `fillHeight` | Boolean | `false` | Fill the parent's height (a flex-column card / widget content area) so an optional `#footer` is pushed to the bottom instead of floating under a short list; the footer stays pinned via its sticky rule when the list overflows. No-op outside a height-constrained parent — opt-in so ordinary in-flow tables are unaffected. |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `sort` | `{ key, order }` | Emitted when a sortable column header is clicked. Cycles through `asc → desc → null`. When the user clears the sort, both `key` and `order` are `null`. |
| `select` | `ids[]` | Emitted when row selection changes; payload is the full updated selection array |
| `select-all` | `isSelectAll` | Emitted when the select-all checkbox is toggled |
| `row-aux-click` | `(row, event)` | Emitted on a row-body middle click (`auxclick`), under the same conditions as `row-click`, so a host can open the row in a new tab with [`openRowTarget`](../utilities/open-row-target.md). A middle click never reaches `row-click`, so a `row-click` listener that navigates keeps the current tab. |
| `row-click` | `(row, event)` | Emitted when a data row is clicked (not the checkbox). The second argument is the native click event, so a host can open the row in a new tab on a ctrl/cmd/shift click with [`openRowTarget`](../utilities/open-row-target.md); listeners that take only the row keep working. A middle click emits `row-aux-click` instead. **Only fires when `selectable` is `false`** (or `rowClickToView` is set) — when `selectable` is `true`, a deliberate click anywhere on a row toggles its selection (emitting `select`) instead — a text-selection drag is not treated as a click. |
| `row-context-menu` | `{ row, event }` | Emitted when a data row is right-clicked. The native `contextmenu` event is prevented, except on a row link (`rowClickRoute`) when nothing listens to this event, so the browser's link menu stays available. Used by CnIndexPage with the [`useContextMenu`](../utilities/composables/use-context-menu.md) composable to show a context menu at the cursor position. |
| `view-all` | `viewAllRoute` | Emitted when the built-in "View all" footer control is activated (before the router push, when there is a router). Lets a host outside a vue-router context react to the button variant. |

### Slots

| Slot | Scope | Description |
|------|-------|-------------|
| `#column-{key}` | `{ row, value }` | Override the cell renderer for a specific column key |
| `#row-actions` | `{ row }` | Content for the last (actions) cell of each row — typically `CnRowActions` |
| `#actions-header` | - | Content for the header above the actions cell — typically a button |
| `#empty` | — | Custom empty-state content shown when `rows` is empty |

## Sorting and filtering from the header

With a `schema`, every column backed by a stored property sorts, also an
object-form column without a `sortable` flag (`{ key: 'title', label: 'Title' }`).
Set `sortable: false` to switch one off. A computed column (`aggregate`) or a
widget column without a property behind it does not sort, because the server
cannot order on it. Without a schema, only `sortable: true` sorts.

Set `filterable` to give every column that can filter a filter button in its
header. `CnIndexPage` does this by default; turn it off for a page with
`config.headerFilters: false`, or for one column with `filterable: false`.

| Column | Panel | Query parameters |
|--------|-------|------------------|
| enum (with `x-enum-labels`), badge colour map | checkboxes | `key[]=a&key[]=b` |
| boolean | yes, no, any | `key=true` |
| number, date, date-time | from and to | `key[gte]`, `key[lte]` (date-time up to `T23:59:59`) |
| `$ref` or `fkResolve` | searchable list of the referenced objects | `key[]=<uuid>` |
| text | contains | `key[like]=term` |

A text filter matches on contains, case-insensitive, through OpenRegister's
`[like]` operator: "acme" finds "Acme B.V.". The term goes out as typed, URL
encoded; OpenRegister escapes `%`, `_` and `\` itself, so the library adds no
wildcards. The header filter owns `key[like]` only. An exact `key=value` from
the facet sidebar or a fixed filter keeps its meaning, and the header neither
shows nor clears it.

The host owns the state. Pass the active-filter map as `activeFilters`
(`{ paramKey: values[] }`, the map the facet sidebar writes) and handle
`column-filter`, which carries `{ key, params }` with every parameter the
column owns; an empty list clears one. `CnIndexPage` merges it into its
filters, fetches once and writes it into the route query. A reference panel
searches `/apps/openregister/api/objects/{register}/{schema}`, with the
register from the column (`widgetProps.register`, `x-external-register`) or
the `filterRegister` prop.

Every sortable header shows a chevron after its label: pale while the
column is unsorted, dark and pointing in the sort direction once it is
sorted. The label and chevron are one real button named by the column label,
and the header carries `aria-sort`, so a screen reader hears the column name
and its sort state. Enter sorts, Shift+Enter adds the column as a secondary
sort key.

A filterable header shows a 14px funnel right after the chevron, in the
muted text colour while no filter is set. It is a separate button, labelled
`Filter by {column}` (Dutch: `Filteren op {column}`), so opening the filter
never sorts the column. Active filters show as the funnel in the primary
colour with a dot, and as removable chips above the table. The panel is a
labelled dialog of native inputs; Escape closes it and focus returns to the
filter button.

## Reference (auto-generated)

The tables below are generated from the SFC source via `vue-docgen-cli`. They reflect what's actually in [`CnDataTable.vue`](https://github.com/ConductionNL/nextcloud-vue/blob/beta/src/components/CnDataTable/CnDataTable.vue) and update automatically whenever the component changes.

<GeneratedRef />

## Card / widget mode (folded from CnTableWidget)

CnDataTable is now the single table component — the deprecated `CnTableWidget`'s
features are folded in here as opt-in props (bare-table usage is unchanged):

- `title` — render a card header (title + total-count badge) above the table.
- `borderless` — drop the container's card chrome so the table sits flush inside
  a parent card (e.g. a `CnWidgetWrapper` dashboard slot).
- `limit` — show only the first N rows; with `viewAllRoute` a "View all" footer appears.
- `viewAllRoute` / `viewAllLabel` — the footer control's route and label. It renders
  as a real `<a :href>` when the router resolves the route, and as a
  `<button type="button">` (emitting `view-all`) otherwise, so it always has a
  link or button role and is keyboard reachable.
- `register` + `schemaId` — self-fetch rows from OpenRegister when no `rows` are passed.
- `fetchParams` — extra query params for the self-fetch (a resolved filter map,
  `_order[field]` ordering, `_limit`); changing it re-triggers the fetch. Used by
  `CnWidgetObjectTable`'s declarative `source`.
- `rowClickRoute` — a function mapping a row to a vue-router route. Each such row renders a real `<a href>` in its first cell, stretched over the row, so hovering shows the URL, a plain or alt click routes in place, a ctrl/cmd/shift or middle click opens a new tab, and the row is reachable with Tab. The link is named by the first cell's text ("Open row" when that is empty or not plain text). There is no link on a `selectable` table without `rowClickToView`, where a row click selects. `CnWidgetObjectTable` rows inherit it. Trade-offs: cell text cannot be selected by dragging on a linked row, and a right-click on it shows the browser's link menu only when no host listens to `row-context-menu`.
- `hideHeader` — drop the column-label row for a compact list widget.
- `#footer` slot (`{ total, shown }`) — supply a custom footer link (e.g. "+ New"
  or an always-shown "View all") with its own handler; works outside a
  vue-router context.

## A second line in a cell (`columns[].secondary`)

`secondary` on a column draws a muted second line under the cell's value: a field key (`"number"`), a template with `{field}` placeholders (`"{number} · {requester.name}"`, dotted paths allowed), or a function of the row. A line that resolves to nothing is not drawn.

```json
{ "key": "title", "label": "Case", "secondary": "{number} · {requester.name}" }
```

Theme hooks: `--cn-table-secondary-size` (0.9em), `--cn-table-secondary-color`.

## A system date as a column (`@self.created`)

A column may name one of the object's system dates in OpenRegister's `@self` block as its key: `@self.created`, `@self.updated`, `@self.published` or `@self.depublished`. The cell reads the value from `@self` and renders it as a date-time, unless the column declares its own `type` or `format`.

```json
{ "key": "@self.created", "label": "Created" }
```

## Pill colours on a column (`columns[].colorMap`)

An enum column renders each value as a status pill. `colorMap` on the column maps the raw value to a pill tone, so the manifest colours the pills without touching the schema. The map is keyed on the raw enum value, not on the translated label, and it wins over the schema property's own `colorMap` or `x-color-map`. A value the map does not name, and a column without a map, keep the default grey pill.

```json
{ "key": "status", "label": "Status", "colorMap": { "new": "primary", "in_progress": "purple", "awaiting_customer": "warning", "resolved": "success", "converted": "teal" } }
```

The tones are `default`, `primary`, `success`, `warning`, `error`, `info`, `purple` and `teal`. See [CnStatusBadge](./cn-status-badge.md).

## Board look

Under the board look the table container is a white card (radius 12, no shadow), header cells are weight 600 on the hover ground, the first data cell is the title column (a 15px link with the `secondary` line under it) and the last column is headed by a visually hidden "Actions".
