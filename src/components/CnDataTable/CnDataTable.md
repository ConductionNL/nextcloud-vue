Basic table — columns with rows:

```vue
<CnDataTable
  :columns="[
    { key: 'name', label: 'Name', sortable: true },
    { key: 'status', label: 'Status' },
    { key: 'created', label: 'Created' },
  ]"
  :rows="[
    { id: 1, name: 'Invoice #001', status: 'open', created: '2024-01-10' },
    { id: 2, name: 'Invoice #002', status: 'paid', created: '2024-01-15' },
    { id: 3, name: 'Invoice #003', status: 'overdue', created: '2024-01-20' },
  ]"
  row-key="id" />
```

With selection and status badges via custom cell slot:

```vue
<template>
  <div>
    <p style="font-size: 13px; margin-bottom: 8px;">Selected IDs: {{ selectedIds.join(', ') || 'none' }}</p>
    <CnDataTable
      :columns="columns"
      :rows="rows"
      :selectable="true"
      :selected-ids="selectedIds"
      row-key="id"
      @select="selectedIds = $event">
      <template #column-status="{ value }">
        <CnStatusBadge :label="value" :color-map="{ open: 'primary', paid: 'success', overdue: 'error' }" />
      </template>
    </CnDataTable>
  </div>
</template>
<script>
export default {
  data() {
    return {
      selectedIds: [],
      columns: [
        { key: 'name', label: 'Name', sortable: true },
        { key: 'status', label: 'Status' },
        { key: 'amount', label: 'Amount' },
      ],
      rows: [
        { id: 1, name: 'Invoice #001', status: 'open', amount: '€ 500' },
        { id: 2, name: 'Invoice #002', status: 'paid', amount: '€ 1.200' },
        { id: 3, name: 'Invoice #003', status: 'overdue', amount: '€ 750' },
      ],
    }
  },
}
</script>
```

Loading state:

```vue
<CnDataTable
  :columns="[
    { key: 'name', label: 'Name' },
    { key: 'status', label: 'Status' },
  ]"
  :rows="[]"
  :loading="true"
  loading-text="Fetching records…"
  row-key="id" />
```

Empty state:

```vue
<CnDataTable
  :columns="[
    { key: 'name', label: 'Name' },
    { key: 'status', label: 'Status' },
  ]"
  :rows="[]"
  row-key="id"
  empty-text="No records found. Add your first item to get started." />
```

Schema-driven — auto-generate columns from a JSON Schema:

```vue
<CnDataTable
  :schema="{
    properties: {
      name:   { type: 'string',  title: 'Name' },
      status: { type: 'string',  title: 'Status', enum: ['open', 'closed'] },
      amount: { type: 'number',  title: 'Amount' },
      active: { type: 'boolean', title: 'Active' },
    },
  }"
  :rows="[
    { id: 1, name: 'Item A', status: 'open',   amount: 100, active: true },
    { id: 2, name: 'Item B', status: 'closed', amount: 250, active: false },
  ]"
  row-key="id" />
```

Schema with `columnOverrides`, `excludeColumns`, and `includeColumns`:

```vue
<CnDataTable
  :schema="{
    properties: {
      name:        { type: 'string', title: 'Name' },
      description: { type: 'string', title: 'Description' },
      status:      { type: 'string', title: 'Status' },
      amount:      { type: 'number', title: 'Amount' },
    },
  }"
  :exclude-columns="['description']"
  :include-columns="['name', 'status', 'amount']"
  :column-overrides="{ status: { width: '160px' }, amount: { label: 'Total (€)' } }"
  :rows="[
    { id: 1, name: 'Alpha', status: 'open',   amount: 400 },
    { id: 2, name: 'Beta',  status: 'closed', amount: 820 },
  ]"
  row-key="id" />
```

Sorted table — controlled `sortKey` / `sortOrder`, `selectedIds`, `rowClass`, `cellClass`:

```vue
<template>
  <CnDataTable
    :columns="[
      { key: 'name',   label: 'Name',   sortable: true },
      { key: 'status', label: 'Status', sortable: true },
      { key: 'amount', label: 'Amount', sortable: true },
    ]"
    :rows="rows"
    :sort-key="sortKey"
    :sort-order="sortOrder"
    :selectable="true"
    :selected-ids="selectedIds"
    :row-class="r => r.status === 'overdue' ? 'cn-row--danger' : ''"
    :cell-class="(r, col) => col.key === 'amount' ? 'cn-cell--mono' : ''"
    :scrollable="true"
    row-key="id"
    @sort="onSort"
    @select="selectedIds = $event">
    <template #actions-header>
      <span style="font-size: 12px; color: var(--color-text-maxcontrast);">Actions</span>
    </template>
    <template #row-actions="{ row }">
      <NcButton type="tertiary" @click="edit(row)">Edit</NcButton>
    </template>
  </CnDataTable>
</template>
<script>
import { NcButton } from '@nextcloud/vue'
export default {
  components: { NcButton },
  data() {
    return {
      sortKey: 'name',
      sortOrder: 'asc',
      selectedIds: [],
      rows: [
        { id: 1, name: 'Alpha', status: 'open',    amount: 300 },
        { id: 2, name: 'Beta',  status: 'overdue', amount: 750 },
        { id: 3, name: 'Gamma', status: 'paid',    amount: 120 },
      ],
    }
  },
  methods: {
    onSort({ key, order }) { this.sortKey = key; this.sortOrder = order },
    edit(row) { alert('Edit ' + row.name) },
  },
}
</script>
```

## Additional props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `schema` | Object | `null` | JSON Schema with `properties` — enables schema-driven column generation |
| `columnOverrides` | Object | `{}` | Per-key column overrides when using `schema` mode: `{ key: { width, label, sortable, … } }` |
| `excludeColumns` | Array | `[]` | Column keys to exclude in schema mode |
| `includeColumns` | Array | `null` | Column keys to include (whitelist) in schema mode |
| `sortKey` | String | `null` | Currently active sort column key (controlled) |
| `sortOrder` | String | `'asc'` | Current sort direction: `'asc'` or `'desc'` |
| `selectedIds` | Array | `[]` | Array of selected row IDs (controlled) |
| `rowClass` | Function | `null` | `(row) => string` — CSS class(es) applied to each `<tr>` |
| `rowClickToView` | Boolean | `false` | Emit `row-click` on a row-body click even while `selectable` (selection then via the checkbox column only) |
| `cellClass` | Function | `null` | `(row, col) => string` — CSS class(es) applied to each `<td>` |
| `scrollable` | Boolean | `false` | Constrain height and make the table vertically scrollable |
| `loadingText` | String | `'Loading…'` | Text shown below the spinner during loading |
| `rowIcon` | String \| Function | `null` | Optional leading icon for every row: a static MDI name applied to all rows, or `(row) => iconName` to vary it per row (resolved via the CnIcon registry). Unset = no icon column. |
| `selectAllLabel` | String | `'Select all rows'` | Accessible name (`aria-label`) for the header select-all checkbox, so screen readers announce a named control (WCAG 4.1.2) |
| `selectRowLabel` | String | `'Select row'` | Accessible name (`aria-label`) for each per-row select checkbox, so screen readers announce a named control (WCAG 4.1.2) |
| `hideHeader` | Boolean | `false` | Hide the column-header row (`<thead>`) — for compact dashboard list widgets that want a plain bordered-row list without column labels |
| `fillHeight` | Boolean | `false` | Fill the parent's height (a flex-column card / widget content area) so an optional `#footer` is pushed to the bottom instead of floating under a short list; the footer stays pinned via its sticky rule when the list overflows. No-op outside a height-constrained parent — opt-in |

## Slots

| Slot | Scope | Description |
|------|-------|-------------|
| `column-{key}` | `{ row, value }` | Override rendering for a specific column cell |
| `row-actions` | `{ row }` | Action buttons rendered in a trailing actions column |
| `actions-header` | — | Content shown in the header cell of the actions column |
| `empty` | — | Custom empty-state content (replaces `emptyText`) |
| `footer` | `{ total, shown }` | Custom footer link/content (e.g. a "+ New" create action or an always-shown "View all"). Renders with its own click handler — usable outside a vue-router context, where the built-in `viewAllRoute` link's `$router.push` no-ops. When omitted, the built-in "View all" link is used for a `limit`-ed subset |

## Card / widget mode (folded from CnTableWidget)

CnDataTable is now the single table component — the deprecated `CnTableWidget`'s
features are folded in here as opt-in props (bare-table usage is unchanged):

- `title` — render a card header (title + total-count badge) above the table.
- `borderless` — drop the container's card chrome so the table sits flush inside
  a parent card (e.g. a `CnWidgetWrapper` dashboard slot).
- `limit` — show only the first N rows; with `viewAllRoute` a "View all" footer appears.
- `viewAllRoute` / `viewAllLabel` — the footer link's route and label.
- `register` + `schemaId` — self-fetch rows from OpenRegister when no `rows` are passed.
- `fetchParams` — extra query params for the self-fetch (a resolved filter map,
  `_order[field]` ordering, `_limit`); changing it re-triggers the fetch. Used by
  `CnWidgetObjectTable`'s declarative `source`.
- `rowClickRoute` — a function mapping a clicked row to a vue-router route to push.
- `hideHeader` — drop the column-label row for a compact list widget.
- `#footer` slot — supply a custom footer link (e.g. "+ New" or an always-shown
  "View all") with its own handler; works outside a vue-router context.

For a compact "name + trailing status" list widget (à la a dashboard panel),
combine `hideHeader` + `borderless` with the reusable cell utilities on each
column's `cellClass`: `cn-cell--strong` (name), `cn-cell--muted cn-cell--end`
(right-aligned muted status).
