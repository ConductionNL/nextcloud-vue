CnIndexPage is the top-level schema-driven index page that combines CnActionsBar, CnDataTable/CnCardGrid, CnPagination, and all single/mass-action dialogs in one component.

Full example — table view with CRUD actions:

```vue
<template>
  <div style="height: 500px; overflow: auto; background: var(--color-main-background); border: 1px solid var(--color-border); border-radius: 8px;">
    <CnIndexPage
      ref="indexPage"
      title="Contacts"
      :objects="objects"
      :schema="schema"
      :loading="loading"
      :pagination="pagination"
      add-label="Add contact"
      :show-mass-delete="true"
      :show-mass-export="true"
      view-mode="table"
      @create="onCreate"
      @edit="onEdit"
      @delete="onDelete"
      @refresh="onRefresh"
      @page-changed="page = $event" />
  </div>
</template>
<script>
export default {
  data() {
    return {
      loading: false,
      page: 1,
      objects: [
        { id: 1, title: 'Jane Smith', email: 'jane@example.com', status: 'active' },
        { id: 2, title: 'Bob Jones', email: 'bob@example.com', status: 'inactive' },
        { id: 3, title: 'Alice Brown', email: 'alice@example.com', status: 'active' },
      ],
      schema: {
        title: 'Contact',
        properties: {
          title: { type: 'string', title: 'Name' },
          email: { type: 'string', title: 'Email', format: 'email' },
          status: { type: 'string', title: 'Status', enum: ['active', 'inactive'] },
        },
        required: ['title', 'email'],
      },
      pagination: { total: 3, page: 1, pages: 1, limit: 20 },
    }
  },
  methods: {
    async onCreate(formData) {
      await new Promise(r => setTimeout(r, 600))
      this.$refs.indexPage.setFormResult({ success: true })
      this.objects.push({ id: Date.now(), ...formData })
    },
    async onEdit(formData) {
      await new Promise(r => setTimeout(r, 600))
      this.$refs.indexPage.setFormResult({ success: true })
    },
    async onDelete(id) {
      await new Promise(r => setTimeout(r, 600))
      this.$refs.indexPage.setSingleDeleteResult({ success: true })
      this.objects = this.objects.filter(o => o.id !== id)
    },
    onRefresh() { this.loading = true; setTimeout(() => { this.loading = false }, 800) },
  },
}
</script>
```

With inline header, custom icon, and view toggle:

```vue
<template>
  <div style="height: 400px; overflow: auto; background: var(--color-main-background); border: 1px solid var(--color-border); border-radius: 8px;">
    <CnIndexPage
      title="Clients"
      description="Manage all clients"
      icon="AccountGroup"
      :show-title="true"
      :show-view-toggle="true"
      :objects="objects"
      :schema="schema"
      :loading="false"
      :pagination="pagination" />
  </div>
</template>
<script>
export default {
  data() {
    return {
      objects: [
        { id: 1, title: 'Acme Corp', status: 'active' },
        { id: 2, title: 'Globex', status: 'inactive' },
      ],
      schema: {
        title: 'Client',
        properties: {
          title: { type: 'string', title: 'Name' },
          status: { type: 'string', title: 'Status', enum: ['active', 'inactive'] },
        },
      },
      pagination: { total: 2, page: 1, pages: 1, limit: 20 },
    }
  },
}
</script>
```

With column and field control:

```vue
<template>
  <div style="height: 400px; overflow: auto; background: var(--color-main-background); border: 1px solid var(--color-border); border-radius: 8px;">
    <CnIndexPage
      title="Orders"
      :objects="orders"
      :schema="schema"
      :exclude-columns="['internalNote']"
      :include-columns="['id','title','status']"
      :column-overrides="{ status: { label: 'State' } }"
      :sort-key="sortKey"
      :sort-order="sortOrder"
      :row-key="'id'"
      :row-class="row => row.urgent ? 'cn-row--urgent' : ''"
      :selectable="true"
      :selected-ids="selectedIds"
      :empty-text="'No orders found'"
      :inline-action-count="3"
      @sort="onSort"
      @select="selectedIds = $event" />
  </div>
</template>
<script>
export default {
  data() {
    return {
      orders: [
        { id: 1, title: 'Order #001', status: 'pending' },
        { id: 2, title: 'Order #002', status: 'shipped' },
      ],
      schema: {
        title: 'Order',
        properties: {
          id: { type: 'integer', title: 'ID' },
          title: { type: 'string', title: 'Order' },
          status: { type: 'string', title: 'Status', enum: ['pending', 'shipped', 'delivered'] },
          internalNote: { type: 'string', title: 'Internal note' },
        },
      },
      sortKey: 'title',
      sortOrder: 'asc',
      selectedIds: [],
    }
  },
  methods: {
    onSort({ key, order }) { this.sortKey = key; this.sortOrder = order },
  },
}
</script>
```

With store integration and action visibility control:

```vue
<template>
  <div style="height: 400px; overflow: auto; background: var(--color-main-background); border: 1px solid var(--color-border); border-radius: 8px;">
    <CnIndexPage
      title="Tasks"
      :objects="tasks"
      :schema="schema"
      :store="null"
      object-type="tasks-task"
      :show-view-action="true"
      :show-edit-action="true"
      :show-copy-action="false"
      :show-delete-action="true"
      :show-add="true"
      :add-disabled="false"
      :refreshing="refreshing"
      :refresh-disabled="false"
      @refresh="loadTasks" />
  </div>
</template>
<script>
export default {
  data() {
    return {
      refreshing: false,
      tasks: [
        { id: 1, title: 'Write tests', status: 'open' },
        { id: 2, title: 'Deploy to staging', status: 'done' },
      ],
      schema: {
        title: 'Task',
        properties: {
          title: { type: 'string', title: 'Task' },
          status: { type: 'string', title: 'Status', enum: ['open', 'done'] },
        },
      },
    }
  },
  methods: {
    loadTasks() {
      this.refreshing = true
      setTimeout(() => { this.refreshing = false }, 800)
    },
  },
}
</script>
```

With mass-action customisation:

```vue
<template>
  <div style="height: 400px; overflow: auto; background: var(--color-main-background); border: 1px solid var(--color-border); border-radius: 8px;">
    <CnIndexPage
      title="Invoices"
      :objects="invoices"
      :schema="schema"
      mass-action-name-field="invoiceNumber"
      :name-formatter="row => row.invoiceNumber + ' — ' + row.client"
      :show-mass-import="true"
      :show-mass-copy="true"
      :export-formats="[{ id: 'pdf', label: 'PDF' }, { id: 'csv', label: 'CSV' }]"
      :import-options="[{ id: 'merge', label: 'Merge with existing' }]">
      <template #mass-actions="{ count, selectedIds }">
        <NcButton @click="sendInvoices(selectedIds)">Send {{ count }} invoices</NcButton>
      </template>
    </CnIndexPage>
  </div>
</template>
<script>
export default {
  data() {
    return {
      invoices: [
        { id: 1, invoiceNumber: 'INV-001', client: 'Acme Corp', status: 'draft' },
        { id: 2, invoiceNumber: 'INV-002', client: 'Globex', status: 'sent' },
      ],
      schema: {
        title: 'Invoice',
        properties: {
          invoiceNumber: { type: 'string', title: 'Invoice #' },
          client: { type: 'string', title: 'Client' },
          status: { type: 'string', title: 'Status', enum: ['draft', 'sent', 'paid'] },
        },
      },
    }
  },
  methods: {
    sendInvoices(ids) { alert('Sending invoices: ' + ids.join(', ')) },
  },
}
</script>
```

With form dialog control:

```vue
<template>
  <div style="height: 400px; overflow: auto; background: var(--color-main-background); border: 1px solid var(--color-border); border-radius: 8px;">
    <CnIndexPage
      title="Products"
      :objects="products"
      :schema="schema"
      :show-form-dialog="true"
      :use-advanced-form-dialog="false"
      :exclude-fields="['internalCode']"
      :include-fields="['title','price','category']"
      :field-overrides="{ price: { label: 'Unit price (€)' } }" />
  </div>
</template>
<script>
export default {
  data() {
    return {
      products: [
        { id: 1, title: 'Widget A', price: 9.99, category: 'widgets', internalCode: 'W-001' },
        { id: 2, title: 'Gadget B', price: 24.99, category: 'gadgets', internalCode: 'G-002' },
      ],
      schema: {
        title: 'Product',
        properties: {
          title: { type: 'string', title: 'Name' },
          price: { type: 'number', title: 'Price' },
          category: { type: 'string', title: 'Category', enum: ['widgets', 'gadgets'] },
          internalCode: { type: 'string', title: 'Internal code' },
        },
      },
    }
  },
}
</script>
```

With overridable header slot and below-header slot:

```vue
<template>
  <div style="height: 400px; overflow: auto; background: var(--color-main-background); border: 1px solid var(--color-border); border-radius: 8px;">
    <CnIndexPage
      title="Reports"
      :objects="reports"
      :schema="schema">
      <template #header="{ title }">
        <div style="padding: 16px; font-size: 1.2em; font-weight: bold; border-bottom: 1px solid var(--color-border);">
          {{ title }}
        </div>
      </template>
      <template #below-header>
        <div style="padding: 8px 16px; background: var(--color-background-hover); border-bottom: 1px solid var(--color-border);">
          These reports refresh nightly.
        </div>
      </template>
    </CnIndexPage>
  </div>
</template>
<script>
export default {
  data() {
    return {
      reports: [
        { id: 1, title: 'Monthly summary', status: 'ready' },
        { id: 2, title: 'Quarterly audit', status: 'pending' },
      ],
      schema: {
        title: 'Report',
        properties: {
          title: { type: 'string', title: 'Report' },
          status: { type: 'string', title: 'Status', enum: ['ready', 'pending'] },
        },
      },
    }
  },
}
</script>
```

## Additional props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `description` | String | `''` | Optional description shown below the title in the page header |
| `showTitle` | Boolean | `false` | Whether to show the inline page header (title, icon, description) |
| `icon` | String | `''` | Optional MDI icon name; falls back to `schema.icon` |
| `columns` | Array | `[]` | Manual column definitions (overrides schema-generated columns) |
| `selectable` | Boolean | `true` | Whether rows/cards can be selected for mass actions |
| `selectedIds` | Array | `[]` | Currently selected row IDs (controlled) |
| `sortKey` | String | `null` | Current sort key |
| `sortOrder` | String | `'asc'` | Current sort direction (`'asc'` or `'desc'`) |
| `rowKey` | String | `'id'` | Property name used as the unique row identifier |
| `excludeColumns` | Array | `[]` | Column keys to hide in schema mode |
| `includeColumns` | Array | `null` | Column keys to show (whitelist); `null` means all |
| `columnOverrides` | Object | `{}` | Per-column config overrides in schema mode |
| `emptyText` | String | `'No items found'` | Text shown in the empty state |
| `rowClass` | Function | `null` | Callback returning CSS class(es) for a row |
| `inlineActionCount` | Number | `2` | How many row actions to show inline (rest go in overflow menu) |
| `showMassImport` | Boolean | `true` | Whether to show the mass Import action |
| `showMassCopy` | Boolean | `true` | Whether to show the mass Copy action |
| `massActionNameField` | String | `'title'` | Property name used to display item names in dialogs |
| `nameFormatter` | Function | `null` | Custom formatter for item names in dialogs; overrides `massActionNameField` |
| `exportFormats` | Array | `[Excel, CSV]` | Available export formats for the export dialog |
| `importOptions` | Array | `[]` | Import option definitions for the import dialog |
| `showFormDialog` | Boolean | `true` | Whether to show the built-in form dialog for Add/Edit |
| `useAdvancedFormDialog` | Boolean | `false` | Use `CnAdvancedFormDialog` instead of `CnFormDialog` for Add/Edit |
| `showViewAction` | Boolean | `true` | Whether to add a View row action |
| `showEditAction` | Boolean | `true` | Whether to add an Edit row action |
| `showCopyAction` | Boolean | `true` | Whether to add a Copy row action |
| `showDeleteAction` | Boolean | `true` | Whether to add a Delete row action |
| `excludeFields` | Array | `[]` | Field keys to exclude from the form dialog |
| `includeFields` | Array | `null` | Field keys to include in the form dialog (whitelist) |
| `fieldOverrides` | Object | `{}` | Per-field config overrides passed to `CnFormDialog` |
| `showViewToggle` | Boolean | `true` | Whether to show the Cards/Table view toggle |
| `refreshing` | Boolean | `false` | Whether a refresh is currently in progress |
| `refreshDisabled` | Boolean | `false` | Whether the refresh button is disabled |
| `addDisabled` | Boolean | `false` | Whether the Add button is disabled |
| `showAdd` | Boolean | `true` | Whether to show the Add button |
| `store` | Object | `null` | Store instance for automatic save integration |
| `objectType` | String | `''` | Object type slug for store integration (e.g. `registerId-schemaId`) |
| `sidebar` | Object | `null` | Manifest-driven sidebar config `{ enabled, columnGroups?, facets?, showMetadata?, search? }`. When `enabled: true`, auto-mounts an embedded `CnIndexSidebar`. Unset keeps the legacy slot-based pattern. |
| `searchValue` | String | `''` | Current search term forwarded to the embedded sidebar (only relevant when `sidebar.enabled`). |
| `visibleColumns` | Array | `null` | Currently visible column keys forwarded to the embedded sidebar. |
| `activeFilters` | Object | `{}` | Currently active facet filters forwarded to the embedded sidebar. |
| `register` | String | `''` | Effective register slug for the page. Forwarded as a prop to the resolved `cardComponent` so bespoke card UIs can match the schema → register pair. Manifest-driven path: `pages[].config.register` flows in via `CnPageRenderer`. |
| `cardComponent` | String | `''` | Optional name of a consumer-provided card component (registered in the `customComponents` registry on `CnAppRoot`) to render in place of the default `CnObjectCard` when the page is in card-grid view mode. Resolution priority: `#card` scoped slot → `cardComponent` registry entry → default `CnObjectCard`. Unknown names log `console.warn` once and fall back to the default. |
| `customComponents` | Object | `null` | Optional explicit `customComponents` registry. Overrides the registry injected from `CnAppRoot` via `cnCustomComponents`. Mostly used by unit tests; production consumers register components on `CnAppRoot` instead. |

## Bespoke card-grid via `cardComponent`

When the schema-driven `CnObjectCard` is not enough — e.g. the
softwarecatalog `Organisaties` page needs a profile-style card with
logo, contactpersoon block, and a CTA button — register the card
component on `CnAppRoot` and reference it by name in the manifest:

```js
// src/customComponents.js
import OrganisatieCard from './components/cards/OrganisatieCard.vue'
export const customComponents = { OrganisatieCard }
```

```vue
<!-- App.vue -->
<CnAppRoot :manifest="manifest" app-id="softwarecatalog" :custom-components="customComponents">
    <router-view />
</CnAppRoot>
```

```jsonc
// src/manifest.json — pages[]
{
    "id": "organisaties",
    "route": "/organisaties",
    "type": "index",
    "title": "Organisaties",
    "config": {
        "register": "softwarecatalog",
        "schema": "organisation",
        "cardComponent": "OrganisatieCard"
    }
}
```

The resolved card component receives `{ item, object, schema, register, selected }`
props and emits `click` (forwarded as `row-click` on the page) and
`select` (forwarded as `select` on the page). `item` and `object` are
aliases — pick whichever feels natural.

## Slots

| Slot | Scope | Description |
|------|-------|-------------|
| `header` | `{ title, description, icon, showTitle }` | Replace the entire page header |
| `below-header` | — | Content between the header and the actions bar |
| `mass-actions` | `{ count, selectedIds }` | Extra mass action buttons shown when items are selected |
| `action-items` | — | Extra buttons in the action bar |
| `actions` | — | Extra action bar buttons (alias) |
| `delete-dialog` | `{ item, close }` | Replace the single-item delete dialog |
| `copy-dialog` | `{ item, close }` | Replace the single-item copy dialog |
| `form-dialog` | `{ item, schema, close }` | Replace the create/edit form dialog |
| `form-fields` | `{ fields, formData, errors, updateField }` | Replace form content inside the built-in `CnFormDialog` |
| `import-fields` | `{ file }` | Extra fields in the import dialog |
| `empty` | — | Custom empty state content |
| `card` | `{ object, selected }` | Custom card template for card view |
| `row-actions` | `{ row }` | Custom row actions |
| `column-{key}` | `{ row, value }` | Custom cell renderer for a specific column |
