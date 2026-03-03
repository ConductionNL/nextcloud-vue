---
sidebar_position: 4
---

# Customising Default Pages

`CnIndexPage` and its sub-components are designed to be extended without forking. This guide covers the most common customisation scenarios with working code examples.

## Overview of extension points

```
CnIndexPage
│
├── CnActionsBar (top toolbar)
│   ├── slot: #action-items         ← add buttons to the Actions dropdown
│   ├── slot: #mass-actions         ← add mass-action buttons when rows selected
│   └── slot: #header-actions       ← add buttons to the far-right of the bar
│
├── CnDataTable (the table)
│   ├── slot: #column-{key}         ← custom cell renderer for a column
│   ├── slot: #row-actions          ← replace the entire ⋯ action menu
│   └── slot: #empty                ← custom empty state
│
├── CnIndexSidebar (right panel)
│   ├── slot: #search-extra         ← append to Search tab
│   └── slot: #columns-extra        ← append to Columns tab
│
└── Dialogs
    ├── slot: #form-dialog          ← replace entire create/edit dialog
    ├── slot: #delete-dialog        ← replace entire delete dialog
    ├── slot: #copy-dialog          ← replace entire copy dialog
    ├── slot: #form-fields          ← replace all form fields at once
    ├── slot: #before-fields        ← prepend content to auto-generated fields
    ├── slot: #after-fields         ← append content to auto-generated fields
    └── slot: #field-{key}          ← replace one specific field
```

---

## Adding actions to the row action menu

The row action menu (the `⋯` button at the end of each row) is driven by the `actions` prop on `CnIndexPage`. Pass an array of action definitions alongside the built-in ones:

```vue
<template>
  <CnIndexPage
    title="Clients"
    :schema="schema"
    :objects="objects"
    :actions="rowActions"
    @action="onAction" />
</template>

<script>
export default {
  computed: {
    rowActions() {
      return [
        { label: 'Send Invoice', icon: 'EmailOutline', handler: 'sendInvoice' },
        { label: 'View on Map',  icon: 'MapMarker',    handler: 'viewMap' },
        { label: 'Archive',      icon: 'Archive',      handler: 'archive', destructive: true },
      ]
    },
  },
  methods: {
    onAction({ action, row }) {
      if (action.handler === 'sendInvoice') this.sendInvoice(row)
      if (action.handler === 'viewMap')     this.openMap(row)
      if (action.handler === 'archive')     this.archive(row)
    },
  },
}
</script>
```

These are appended after the built-in View / Edit / Copy / Delete actions. To hide a built-in action, use the corresponding boolean prop:

```vue
<CnIndexPage
  :show-edit-action="true"
  :show-copy-action="false"
  :show-delete-action="true"
  :actions="rowActions" />
```

### Full control with the #row-actions slot

If you need full control over the row action menu (e.g. to conditionally show actions per row), use the `#row-actions` slot. This **replaces** the built-in row actions entirely:

```vue
<CnIndexPage title="Clients" :schema="schema" :objects="objects">
  <template #row-actions="{ row }">
    <CnRowActions
      :actions="actionsForRow(row)"
      :row="row"
      @action="onAction" />
  </template>
</CnIndexPage>

<script>
methods: {
  actionsForRow(row) {
    const actions = [
      { label: 'Edit',   icon: 'Pencil', handler: 'edit' },
    ]
    if (row.status !== 'archived') {
      actions.push({ label: 'Archive', icon: 'Archive', handler: 'archive', destructive: true })
    }
    if (row.status === 'archived') {
      actions.push({ label: 'Restore', icon: 'Restore', handler: 'restore' })
    }
    return actions
  },
}
</script>
```

---

## Adding items to the Actions dropdown (top bar)

The top bar's `···  Actions` dropdown is the bulk-actions menu. Add custom items via the `#action-items` slot on `CnIndexPage`:

```vue
<CnIndexPage title="Clients" :schema="schema" :objects="objects">
  <template #action-items>
    <NcActionButton @click="generateReport">
      <template #icon>
        <ChartBar :size="20" />
      </template>
      Generate Report
    </NcActionButton>

    <NcActionButton @click="syncWithCrm">
      <template #icon>
        <Sync :size="20" />
      </template>
      Sync with CRM
    </NcActionButton>
  </template>
</CnIndexPage>
```

These items appear below the built-in Refresh / Import / Export in the dropdown.

### Adding mass-action items (appear when rows are selected)

Items that should only be active when rows are selected go in the `#mass-actions` slot:

```vue
<CnIndexPage
  title="Clients"
  :schema="schema"
  :objects="objects"
  :selectable="true">
  <template #mass-actions="{ count, selectedIds }">
    <NcActionButton
      :disabled="count === 0"
      @click="bulkSendInvoices(selectedIds)">
      <template #icon>
        <EmailMultipleOutline :size="20" />
      </template>
      Send Invoices ({{ count }})
    </NcActionButton>

    <NcActionButton
      :disabled="count === 0"
      @click="bulkArchive(selectedIds)">
      <template #icon>
        <Archive :size="20" />
      </template>
      Archive Selected
    </NcActionButton>
  </template>
</CnIndexPage>
```

### Adding extra header buttons (top-right)

To add icon buttons in the far-right of the toolbar (next to the sidebar toggle), use `#header-actions`:

```vue
<CnIndexPage title="Clients" :schema="schema" :objects="objects">
  <template #header-actions>
    <NcButton
      type="tertiary"
      :aria-label="t('myapp', 'Advanced search')"
      @click="openAdvancedSearch">
      <template #icon>
        <FilterVariant :size="20" />
      </template>
    </NcButton>
  </template>
</CnIndexPage>
```

---

## Custom cell renderers

Override how a specific column is displayed without touching the rest of the table. Use `#column-{key}` where `{key}` matches the schema property name:

```vue
<CnIndexPage title="Clients" :schema="schema" :objects="objects">
  <!-- Status column: badge with colour -->
  <template #column-status="{ row, value }">
    <CnStatusBadge :text="value" :color="statusColor(value)" />
  </template>

  <!-- Website column: clickable link -->
  <template #column-website="{ row, value }">
    <a v-if="value" :href="value" target="_blank" rel="noopener">
      {{ value }}
    </a>
    <span v-else>—</span>
  </template>

  <!-- Amount column: formatted currency -->
  <template #column-contractValue="{ row, value }">
    <span class="amount">{{ formatCurrency(value) }}</span>
  </template>
</CnIndexPage>
```

The slot scope provides:
- `row` — the full row data object
- `value` — the extracted cell value for this column

---

## Custom form fields

### Override one field

Replace a single auto-generated form field while keeping the rest:

```vue
<CnIndexPage title="Clients" :schema="schema" :objects="objects" @create="onCreate">
  <!-- Replace the auto-generated "status" field with a custom select -->
  <template #field-status="{ field, value, updateField }">
    <div class="form-field">
      <label>{{ field.label }}</label>
      <NcSelect
        :value="value"
        :options="statusOptions"
        @input="updateField(field.key, $event)" />
    </div>
  </template>

  <!-- Add a rich-text editor for the description field -->
  <template #field-description="{ field, value, updateField }">
    <div class="form-field">
      <label>{{ field.label }}</label>
      <WysiwygEditor
        :value="value"
        @change="updateField(field.key, $event)" />
    </div>
  </template>
</CnIndexPage>
```

### Append extra fields

Add fields to the form that aren't in the schema (e.g. a confirmation checkbox):

```vue
<CnIndexPage title="Clients" :schema="schema" :objects="objects" @create="onCreate">
  <template #after-fields="{ formData, updateField }">
    <NcCheckboxRadioSwitch
      :checked="formData.acceptTerms"
      @update:checked="updateField('acceptTerms', $event)">
      I confirm this client has signed the data processing agreement
    </NcCheckboxRadioSwitch>
  </template>
</CnIndexPage>
```

### Replace the entire form

For complex forms, replace the dialog content completely:

```vue
<CnIndexPage title="Clients" :schema="schema" :objects="objects">
  <template #form-dialog="{ item, schema, close }">
    <MyCustomClientForm
      :client="item"
      :schema="schema"
      @save="onSave"
      @cancel="close" />
  </template>
</CnIndexPage>
```

---

## Custom delete dialog

Override the delete confirmation with your own dialog:

```vue
<CnIndexPage title="Clients" :schema="schema" :objects="objects" @delete="onDelete">
  <template #delete-dialog="{ item, close }">
    <NcDialog
      :name="t('myapp', 'Delete Client')"
      :open="true"
      @close="close">
      <p>
        {{ t('myapp', 'You are about to delete {name}. This will also remove all associated contacts and leads.', { name: item?.name }) }}
      </p>
      <template #actions>
        <NcButton @click="close">{{ t('myapp', 'Cancel') }}</NcButton>
        <NcButton type="error" @click="onDelete(item?.id); close()">
          {{ t('myapp', 'Delete everything') }}
        </NcButton>
      </template>
    </NcDialog>
  </template>
</CnIndexPage>
```

---

## Custom empty state

```vue
<CnIndexPage title="Clients" :schema="schema" :objects="objects">
  <template #empty>
    <div class="empty-state">
      <AccountGroupOutline :size="64" />
      <h3>{{ t('myapp', 'No clients yet') }}</h3>
      <p>{{ t('myapp', 'Add your first client to get started.') }}</p>
      <NcButton type="primary" @click="openCreateDialog">
        {{ t('myapp', 'Add Client') }}
      </NcButton>
    </div>
  </template>
</CnIndexPage>
```

---

## Excluding or reordering columns

Control which schema columns appear in the table:

```vue
<!-- Show only specific columns -->
<CnIndexPage
  :include-columns="['name', 'email', 'status', 'createdAt']" />

<!-- Hide specific columns -->
<CnIndexPage
  :exclude-columns="['internalId', 'uuid', 'updatedAt']" />

<!-- Override column display properties -->
<CnIndexPage
  :column-overrides="{
    name:        { label: 'Full Name', width: '200px' },
    status:      { sortable: false },
    contractValue: { label: 'Value (€)' },
  }" />
```

---

## Excluding or reordering form fields

The same pattern applies to the create/edit form:

```vue
<!-- Only show these fields in the form -->
<CnIndexPage
  :include-fields="['name', 'email', 'phone', 'clientType']" />

<!-- Hide internal fields from the form -->
<CnIndexPage
  :exclude-fields="['uuid', 'createdAt', 'updatedAt', 'internalCode']" />

<!-- Override form field properties -->
<CnIndexPage
  :field-overrides="{
    clientType: {
      label: 'Type',
      widget: 'select',
      options: [
        { value: 'person', label: 'Individual' },
        { value: 'organisation', label: 'Organisation' },
      ],
    },
    email: { placeholder: 'name@company.com' },
  }" />
```

---

## Using CnDataTable and CnRowActions directly

If `CnIndexPage` is too opinionated for your use case, you can compose the sub-components directly:

```vue
<template>
  <div>
    <!-- Your own toolbar -->
    <div class="toolbar">
      <NcButton type="primary" @click="onCreate">Add Client</NcButton>
    </div>

    <!-- The table -->
    <CnDataTable
      :schema="schema"
      :rows="objects"
      :sort-key="sortKey"
      :sort-order="sortOrder"
      :selectable="true"
      :selected-ids="selectedIds"
      @sort="onSort"
      @select="selectedIds = $event"
      @row-click="onRowClick">

      <!-- Custom cell for status -->
      <template #column-status="{ row, value }">
        <CnStatusBadge :text="value" :color="statusColor(value)" />
      </template>

      <!-- Custom row actions -->
      <template #row-actions="{ row }">
        <CnRowActions
          :actions="actionsForRow(row)"
          :row="row"
          @action="onAction" />
      </template>
    </CnDataTable>

    <!-- Your own pagination -->
    <CnPagination
      :current-page="pagination.page"
      :total-pages="pagination.pages"
      :total-items="pagination.total"
      :current-page-size="pagination.limit"
      @page-changed="fetchPage"
      @page-size-changed="setPageSize" />
  </div>
</template>
```

This gives you complete layout control while still benefiting from schema-driven column generation, type-aware cell rendering, and the pagination component.
