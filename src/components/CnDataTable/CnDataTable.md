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
    <p style="font-size: 13px; margin-bottom: 8px;">Selected: {{ selected.map(r => r.name).join(', ') || 'none' }}</p>
    <CnDataTable
      :columns="columns"
      :rows="rows"
      :selectable="true"
      :selected-rows="selected"
      row-key="id"
      @selection-change="selected = $event">
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
      selected: [],
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
