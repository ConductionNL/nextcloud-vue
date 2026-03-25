---
sidebar_position: 4
---

# Customising Default Pages

`CnIndexPage` and its sub-components are designed to be extended without forking. This guide covers every customisation scenario with working code examples.

## Overview of extension points

```
CnIndexPage
│
├── Page header (inline title / icon / description)
│   prop: show-title, icon, description
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
├── CnCardGrid (card view — when viewMode="cards")
│   ├── slot: #card                 ← replace the entire card template
│   ├── slot: #card-actions         ← add action buttons on each card
│   └── slot: #card-badges          ← add badge/status chips to each card
│
├── CnIndexSidebar (right panel)
│   ├── prop: default-tab           ← set the initially active tab
│   ├── event: tab-change           ← notified when the user switches tabs
│   ├── slot: #tabs                 ← inject additional NcAppSidebarTab components
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
    ├── slot: #field-{key}          ← replace one specific field
    ├── slot: #field-{key}-option   ← custom dropdown option rendering for a select field
    ├── slot: #field-{key}-selected-option ← custom selected display for a select field
    └── slot: #import-fields        ← add extra fields to the import dialog
```

---

## Props reference

`CnIndexPage` accepts a large number of props that control built-in behaviour before you reach for slots.

### Page header

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | String | *(required)* | Page title — shown in the sidebar header or inline |
| `description` | String | `''` | Subtitle shown below the title when `show-title` is true |
| `show-title` | Boolean | `false` | Render the title, icon, and description inline above the table rather than in the sidebar |
| `icon` | String | `''` | MDI icon name for the page. Falls back to `schema.icon` when not set |

### Layout and view

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `view-mode` | String | `'table'` | Starting view: `'table'` or `'cards'` |
| `show-view-toggle` | Boolean | `true` | Show or hide the Cards / Table toggle in the toolbar |
| `selectable` | Boolean | `true` | Whether rows / cards can be checked for mass actions |
| `row-key` | String | `'id'` | Property used as the unique row identifier when `id` is not the primary key |
| `row-class` | Function | `null` | `(row) => string \| object` — apply CSS classes to individual rows dynamically |
| `inline-action-count` | Number | `2` | How many row-action buttons appear inline before the rest collapse into the `⋯` dropdown |

### Add button

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `add-label` | String | `''` | Override the Add button label. Defaults to `'Add {schema.title}'` |

### Built-in row actions

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `show-edit-action` | Boolean | `true` | Include the built-in Edit action in the row menu |
| `show-copy-action` | Boolean | `true` | Include the built-in Copy action in the row menu |
| `show-delete-action` | Boolean | `true` | Include the built-in Delete action in the row menu |
| `actions` | Array | `[]` | App-defined action definitions appended after built-in actions |

### Mass actions

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `show-mass-import` | Boolean | `true` | Show the built-in Import button in the Actions dropdown |
| `show-mass-export` | Boolean | `true` | Show the built-in Export button in the Actions dropdown |
| `show-mass-copy` | Boolean | `true` | Show the built-in Copy (mass) button |
| `show-mass-delete` | Boolean | `true` | Show the built-in Delete (mass) button |
| `mass-action-name-field` | String | `'title'` | Property used to display item names inside mass-action dialogs |
| `export-formats` | Array | `[{ id:'excel', label:'Excel (.xlsx)' }, ...]` | Available formats in the export dialog |
| `import-options` | Array | `[]` | Option checkboxes shown in the import dialog |

### Columns and form fields

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `include-columns` | Array | `null` | Whitelist of column keys to show (all others hidden) |
| `exclude-columns` | Array | `[]` | Column keys to hide |
| `column-overrides` | Object | `{}` | Per-column property overrides (label, width, sortable, …) |
| `include-fields` | Array | `null` | Whitelist of form-field keys |
| `exclude-fields` | Array | `[]` | Form-field keys to hide |
| `field-overrides` | Object | `{}` | Per-field property overrides (label, widget, placeholder, options, …) |
| `show-form-dialog` | Boolean | `true` | Whether the built-in create / edit dialog is enabled at all |

---

## Events reference

| Event | Payload | Description |
|-------|---------|-------------|
| `add` | — | Add button clicked (fires before dialog opens) |
| `create` | `object` | Form confirmed in create mode |
| `edit` | `object` | Form confirmed in edit mode |
| `delete` | `string` | Single delete confirmed (item ID) |
| `copy` | `{ id, newName }` | Single copy confirmed |
| `mass-delete` | `string[]` | Mass delete confirmed (array of IDs) |
| `mass-copy` | `{ ids, getName }` | Mass copy confirmed |
| `mass-export` | `{ ids, format }` | Mass export confirmed |
| `mass-import` | `{ file, options }` | Mass import confirmed |
| `refresh` | — | Refresh button clicked |
| `row-click` | `object` | Row or card clicked |
| `sort` | `{ key, order }` | Column header clicked to sort |
| `page-changed` | `number` | Pagination page changed |
| `page-size-changed` | `number` | Page size changed |
| `select` | `string[]` | Row selection changed |
| `action` | `{ action, row }` | Custom row action triggered |
| `view-mode-change` | `'table' \| 'cards'` | View mode toggled |

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

### Controlling how many actions show inline

By default two action buttons appear directly in the row before the rest collapse into `⋯`. Use `inline-action-count` to change this:

```vue
<!-- Show all three custom actions inline, no dropdown -->
<CnIndexPage :actions="rowActions" :inline-action-count="3" />

<!-- Collapse everything into the dropdown immediately -->
<CnIndexPage :actions="rowActions" :inline-action-count="0" />
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

### Hiding built-in mass actions

Remove individual built-in actions from the dropdown without touching the slot:

```vue
<CnIndexPage
  :show-mass-import="false"
  :show-mass-export="false"
  :show-mass-copy="true"
  :show-mass-delete="true" />
```

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

## Dynamic row styling

Use the `row-class` prop to apply CSS classes to individual rows based on their data. The function receives the full row object and must return a string, an array of strings, or a Vue class-binding object:

```vue
<CnIndexPage
  :schema="schema"
  :objects="objects"
  :row-class="rowClass" />

<script>
methods: {
  rowClass(row) {
    if (row.status === 'overdue')  return 'row--danger'
    if (row.status === 'pending')  return 'row--warning'
    if (row.archived)              return 'row--muted'
    return ''
  },
}
</script>

<style>
.row--danger  { background: var(--color-error-background); }
.row--warning { background: var(--color-warning-background); }
.row--muted   { opacity: 0.55; }
</style>
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

## Card view customisation

When `view-mode="cards"` is active, `CnIndexPage` renders a `CnCardGrid` instead of the table. Three slots let you customise individual cards:

### Replace the entire card

```vue
<CnIndexPage
  title="Clients"
  :schema="schema"
  :objects="objects"
  view-mode="cards">
  <template #card="{ object, selected }">
    <div :class="['my-card', { 'my-card--selected': selected }]">
      <img :src="object.avatarUrl" alt="" />
      <h3>{{ object.name }}</h3>
      <p>{{ object.email }}</p>
    </div>
  </template>
</CnIndexPage>
```

### Add badge / status chips to cards

```vue
<CnIndexPage view-mode="cards" :schema="schema" :objects="objects">
  <template #card-badges="{ object }">
    <span v-if="object.verified" class="badge badge--success">Verified</span>
    <span v-if="object.overdue"  class="badge badge--error">Overdue</span>
  </template>
</CnIndexPage>
```

### Add action buttons to cards

```vue
<CnIndexPage view-mode="cards" :schema="schema" :objects="objects">
  <template #card-actions="{ object }">
    <NcButton @click="sendInvoice(object)">Send Invoice</NcButton>
    <NcButton type="error" @click="deleteClient(object)">Delete</NcButton>
  </template>
</CnIndexPage>
```

### Controlling the view mode toggle

Persist the user's choice or set the starting mode via the `view-mode` prop. Listen for `view-mode-change` to store it:

```vue
<CnIndexPage
  :view-mode="userPrefs.viewMode"
  @view-mode-change="userPrefs.viewMode = $event" />
```

Hide the toggle entirely when only one mode makes sense:

```vue
<CnIndexPage :show-view-toggle="false" view-mode="cards" />
```

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

The slot scope for `#field-{key}` provides:
- `field` — the full field definition (`key`, `label`, `type`, `widget`, `required`, …)
- `value` — the current form value for this field
- `error` — current validation error string (empty when valid)
- `updateField(key, value)` — call this to update the form data

### Custom option rendering for select fields

For select, multiselect, and tags fields, you can customize how dropdown options and selected values are displayed without replacing the entire field. Use `#field-{key}-option` and `#field-{key}-selected-option`:

```vue
<CnIndexPage title="Clients" :schema="schema" :objects="objects" @create="onCreate">
  <!-- Custom rendering for the 'category' select dropdown options -->
  <template #field-category-option="{ label, description, count }">
    <div class="category-option">
      <strong>{{ label }}</strong>
      <span v-if="count" class="count">({{ count }})</span>
      <p v-if="description">{{ description }}</p>
    </div>
  </template>

  <!-- Simpler display when selected -->
  <template #field-category-selected-option="{ label }">
    {{ label }}
  </template>
</CnIndexPage>
```

The slot scope receives all properties of the option object. This is especially useful with async select fields where options have rich data beyond just a label. See [CnFormDialog — Async Select](../components/cn-form-dialog.md#async-select) for details.

### Prepend or append extra fields

Add content before or after the auto-generated fields without replacing any of them:

```vue
<CnIndexPage title="Clients" :schema="schema" :objects="objects" @create="onCreate">
  <template #before-fields>
    <NcNoteCard type="warning">
      Fields marked * are shared across all organisations.
    </NcNoteCard>
  </template>

  <template #after-fields="{ formData, updateField }">
    <NcCheckboxRadioSwitch
      :checked="formData.acceptTerms"
      @update:checked="updateField('acceptTerms', $event)">
      I confirm this client has signed the data processing agreement
    </NcCheckboxRadioSwitch>
  </template>
</CnIndexPage>
```

The `#after-fields` slot scope provides:
- `formData` — the complete current form data object
- `updateField(key, value)` — update any field (including extra ones not in the schema)

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

## Two-phase dialog pattern (async save / delete)

Dialogs in `CnIndexPage` follow a two-phase pattern: they emit an event when the user confirms, then wait for the parent to call a result method. This keeps the dialogs stateless and lets you perform async API calls between the two phases.

```
User clicks Save
      │
      ▼
Dialog emits @create / @edit / @delete / …
      │
      ▼
Parent performs async operation (API call)
      │
      ├─ success → $refs.page.setFormResult({ success: true })
      └─ failure → $refs.page.setFormResult({ error: 'Name already taken' })
```

### Example: async create with server validation

```vue
<template>
  <CnIndexPage
    ref="page"
    :schema="schema"
    :objects="objects"
    @create="onCreate" />
</template>

<script>
export default {
  methods: {
    async onCreate(formData) {
      try {
        await this.clientStore.createClient(formData)
        this.$refs.page.setFormResult({ success: true })
      } catch (e) {
        if (e.response?.status === 422) {
          // Show per-field server validation errors inline
          this.$refs.page.setValidationErrors(e.response.data.errors)
        } else {
          this.$refs.page.setFormResult({ error: e.message })
        }
      }
    },
  },
}
</script>
```

### Result methods on CnIndexPage

| Method | Description |
|--------|-------------|
| `setFormResult({ success?, error? })` | Resolve the create / edit dialog |
| `setSingleDeleteResult({ success?, error? })` | Resolve the single-item delete dialog |
| `setSingleCopyResult({ success?, error? })` | Resolve the single-item copy dialog |
| `setMassDeleteResult({ success?, error? })` | Resolve the mass-delete dialog |
| `setMassCopyResult({ success?, error? })` | Resolve the mass-copy dialog |
| `setExportResult({ success?, error? })` | Resolve the export dialog |
| `setImportResult({ success?, error?, summary? })` | Resolve the import dialog |

### Per-field server validation errors

When the API returns field-level validation messages, show them inline in the form without closing the dialog:

```js
// API returns: { errors: { email: 'Already in use', name: 'Too long' } }
this.$refs.page.setValidationErrors(e.response.data.errors)
```

---

## Programmatic dialog control

Open the create or edit dialog from code, without the user clicking the Add button:

```js
// Open the create dialog (blank form)
this.$refs.page.openFormDialog(null)

// Open the edit dialog pre-filled with a specific row
this.$refs.page.openFormDialog(this.selectedRow)
```

This is useful for deep-link navigation or triggering the dialog from a button elsewhere on the page:

```vue
<template>
  <div>
    <NcButton @click="quickAdd">Quick Add Client</NcButton>

    <CnIndexPage ref="page" :schema="schema" :objects="objects" @create="onCreate" />
  </div>
</template>

<script>
methods: {
  quickAdd() {
    this.$refs.page.openFormDialog(null)
  },
}
</script>
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
      <NcButton type="primary" @click="$refs.page.openFormDialog(null)">
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
    name:          { label: 'Full Name', width: '200px' },
    status:        { sortable: false },
    contractValue: { label: 'Value (€)' },
  }" />
```

---

## Excluding or reordering form fields

The same pattern applies to the create / edit form:

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

## Import dialog extra fields

Inject custom controls into the import dialog (e.g. a register or schema selector) using the `#import-fields` slot:

```vue
<CnIndexPage
  title="Clients"
  :schema="schema"
  :objects="objects"
  @mass-import="onImport">
  <template #import-fields="{ file }">
    <div v-if="file" class="form-field">
      <label>{{ t('myapp', 'Import into register') }}</label>
      <NcSelect
        v-model="importRegister"
        :options="registerOptions" />
    </div>
  </template>
</CnIndexPage>
```

The slot scope provides:
- `file` — the `File` object once the user has selected one (or `null` before selection)

---

## Sidebar customisation

`CnIndexSidebar` is rendered in `App.vue` alongside the router view, not inside `CnIndexPage`. All sidebar customisation is applied directly to the `<CnIndexSidebar>` element.

### Setting the default active tab

Use the `default-tab` prop to control which tab is open when the sidebar first appears. The built-in tab IDs are `'search-tab'` and `'columns-tab'`:

```vue
<!-- Open on the Columns tab instead of Search -->
<CnIndexSidebar
  :schema="sidebarState.schema"
  default-tab="columns-tab"
  @tab-change="onTabChange" />
```

Listen to `tab-change` to persist the user's choice:

```vue
<CnIndexSidebar
  :schema="sidebarState.schema"
  :default-tab="userPrefs.sidebarTab"
  @tab-change="userPrefs.sidebarTab = $event" />
```

### Adding custom tabs

Use the `#tabs` slot to inject one or more additional `NcAppSidebarTab` components. Assign an `order` higher than `2` to place them after the built-in Search (order 1) and Columns (order 2) tabs:

```vue
<CnIndexSidebar
  :schema="sidebarState.schema"
  default-tab="activity-tab">
  <template #tabs>
    <NcAppSidebarTab
      id="activity-tab"
      name="Activity"
      :order="3">
      <template #icon>
        <ClockOutline :size="20" />
      </template>

      <!-- Your tab content here -->
      <ActivityFeed :object-id="sidebarState.objectId" />
    </NcAppSidebarTab>

    <NcAppSidebarTab
      id="relations-tab"
      name="Relations"
      :order="4">
      <template #icon>
        <LinkVariant :size="20" />
      </template>

      <RelationsPanel :object-id="sidebarState.objectId" />
    </NcAppSidebarTab>
  </template>
</CnIndexSidebar>
```

:::tip Tab IDs must be unique
The `id` you set on your `NcAppSidebarTab` is the value used with `default-tab` and emitted by `tab-change`. Make sure it doesn't clash with `'search-tab'` or `'columns-tab'`.
:::

### Appending content inside existing tabs

To add content at the bottom of the Search or Columns tab without replacing it, use `#search-extra` and `#columns-extra`. These slots are available on both `CnIndexSidebar` (direct usage) and `CnIndexPage` (pass-through to sidebar via the `sidebarState` pattern).

#### Via CnIndexSidebar directly

```vue
<CnIndexSidebar :schema="sidebarState.schema">
  <template #search-extra>
    <div class="sidebar-section">
      <h3>Saved searches</h3>
      <NcActionButton
        v-for="s in savedSearches"
        :key="s.id"
        @click="applySearch(s)">
        {{ s.label }}
      </NcActionButton>
    </div>
  </template>

  <template #columns-extra>
    <NcCheckboxRadioSwitch v-model="showComputedFields">
      Show computed fields
    </NcCheckboxRadioSwitch>
  </template>
</CnIndexSidebar>
```

#### Via CnIndexPage (pass-through)

```vue
<CnIndexPage :schema="schema" :objects="objects">
  <template #search-extra>
    <div class="sidebar-section">
      <h3>Saved searches</h3>
      <NcActionButton
        v-for="s in savedSearches"
        :key="s.id"
        @click="applySearch(s)">
        {{ s.label }}
      </NcActionButton>
    </div>
  </template>
</CnIndexPage>
```

```vue
<CnIndexPage :schema="schema" :objects="objects">
  <template #columns-extra>
    <div class="sidebar-section">
      <NcCheckboxRadioSwitch v-model="showComputedFields">
        Show computed fields
      </NcCheckboxRadioSwitch>
    </div>
  </template>
</CnIndexPage>
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
      :row-class="rowClass"
      :scrollable="true"
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
      :page-size-options="[10, 25, 50, 100]"
      @page-changed="fetchPage"
      @page-size-changed="setPageSize" />
  </div>
</template>
```

### CnDataTable props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `schema` | Object | `null` | Schema for auto-generating columns |
| `columns` | Array | `[]` | Manual column definitions (bypasses schema) |
| `rows` | Array | `[]` | Row data |
| `loading` | Boolean | `false` | Show loading spinner |
| `sort-key` | String | `null` | Currently sorted column key |
| `sort-order` | String | `'asc'` | `'asc'` or `'desc'` |
| `selectable` | Boolean | `false` | Show selection checkboxes |
| `selected-ids` | Array | `[]` | Currently selected IDs |
| `row-key` | String | `'id'` | Unique row identifier property |
| `row-class` | Function | `null` | `(row) => string \| object` for per-row CSS |
| `scrollable` | Boolean | `false` | Constrain table height; rows scroll internally |
| `empty-text` | String | `'No items found'` | Empty state message |
| `include-columns` | Array | `null` | Column key whitelist |
| `exclude-columns` | Array | `[]` | Column keys to hide |
| `column-overrides` | Object | `{}` | Per-column overrides |

### CnPagination props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `current-page` | Number | `1` | Current page (1-based) |
| `total-pages` | Number | `1` | Total pages |
| `total-items` | Number | `0` | Total items across all pages |
| `current-page-size` | Number | `20` | Items per page |
| `page-size-options` | Array | `[10, 20, 50, 100, 250, 500, 1000]` | Page size dropdown options |
| `min-items-to-show` | Number | `10` | Minimum items before pagination renders |
| `page-info-format` | String | `'Page {current} of {total}'` | Format string with `{current}` and `{total}` placeholders |

This gives you complete layout control while still benefiting from schema-driven column generation, type-aware cell rendering, and the pagination component.
