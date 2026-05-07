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
| `cellClass` | Function | `null` | `(row, col) => string` — CSS class(es) applied to each `<td>` |
| `scrollable` | Boolean | `false` | Constrain height and make the table vertically scrollable |
| `loadingText` | String | `'Loading…'` | Text shown below the spinner during loading |

## Slots

| Slot | Scope | Description |
|------|-------|-------------|
| `column-{key}` | `{ row, value }` | Override rendering for a specific column cell |
| `row-actions` | `{ row }` | Action buttons rendered in a trailing actions column |
| `actions-header` | — | Content shown in the header cell of the actions column |
| `empty` | — | Custom empty-state content (replaces `emptyText`) |
