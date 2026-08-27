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
| `showTitle` | Boolean | `false` | Whether to show the inline page header (title, icon, description) VISIBLY. When `false` the `<h1>` is still rendered visually-hidden, so `<main>` always has an accessible heading (WCAG 2.4.6 / 1.3.1) |
| `icon` | String | `''` | Optional MDI icon name; falls back to `schema.icon` |
| `columns` | Array | `[]` | Manual column definitions (overrides schema-generated columns) |
| `selectable` | Boolean | `true` | Whether rows/cards can be selected for mass actions |
| `rowClickToView` | Boolean | `false` | Emit `row-click` (to open/navigate) on a row/card click even while `selectable` — selection then via the checkbox only. Set automatically by CnPageRenderer when a matching detail page exists |
| `selectedIds` | Array | `[]` | Currently selected row IDs (controlled) |
| `sortKey` | String | `null` | Current sort key |
| `sortOrder` | String | `'asc'` | Current sort direction (`'asc'` or `'desc'`) |
| `sortKeys` | Array | `[]` | External/host-controlled multi-column ("shift+click") sort key list, `[{ key, order }, …]`; self-fetch mode persists/restores its own multi-sort via `$route.query._order` instead |
| `defaultSort` | Array | `[]` | Default multi-key client-side sort (`[{ field, order }]`) applied while no explicit `sortKey` is active; suppressed once the user sorts a column. |
| `rowKey` | String | `'id'` | Property name used as the unique row identifier |
| `activeOrganisation` | Object \| null | `null` | Optional multi-tenant binding. When the bound organisation entity changes, the page calls `store.setActiveTenantOrganisation(uuid)` so the next `fetchCollection()` stamps `X-OpenRegister-Organisation: <uuid>` and the in-memory list caches are cleared. Wire this from a tenant-switcher higher in the tree; leave `null` for single-tenant pages. |
| `excludeColumns` | Array | `[]` | Column keys to hide in schema mode |
| `includeColumns` | Array | `null` | Column keys to show (whitelist); `null` means all |
| `columnOverrides` | Object | `{}` | Per-column config overrides in schema mode |
| `emptyText` | String | `'No items found'` | Text shown in the empty state |
| `loadingText` | String | `'Loading…'` | Accessible label for the loading spinner (NcLoadingIcon aria-label) |
| `rowIcon` | String \| Function | `null` | Optional leading icon for every table row — a static MDI name or `(row) => iconName`. Forwarded to CnDataTable; fed from the manifest as `pages[].config.rowIcon`. Unset = no icon column. |
| `rowClass` | Function | `null` | Callback returning CSS class(es) for a row |
| `rowIcon` | String \| Function | `null` | Optional leading row icon forwarded to CnDataTable — a static MDI icon name or `(row) => iconName`. Fed from the manifest as `pages[].config.rowIcon`; unset = no icon column |
| `inlineActionCount` | Number | `2` | How many row actions to show inline (rest go in overflow menu) |
| `showMassImport` | Boolean | `true` | Whether to show the mass Import action |
| `showMassCopy` | Boolean | `true` | Whether to show the mass Copy action |
| `allowExport` | Boolean | `false` | Opt-in flag for the native Export menu (CSV/Excel) next to the Add button. Renders only when `true` AND the resolved schema is flagged `exportable: true`; navigates to OpenRegister's export leaf (`GET /apps/openregister/api/objects/{register}/{schema}/export`), passing `$route.query` through as filters. Distinct from `showMassExport`, which exports the fetched/selected rows via a blob download. |
| `allowSavedViews` | Boolean | `false` | Opt-in flag for the saved-views control (saved-views-ui): a Views dropdown listing the user's OpenRegister saved-search views (`GET /apps/openregister/api/views`). Applying one writes its stored filters/search/sort into the route query (`_search`/`_sortKey`/`_sortOrder` reserved keys + plain filter keys); "Save current view…" persists the current route-query state via POST; own views can be deleted after confirmation. Emits `apply-view`. |
| `massActionNameField` | String | `'title'` | Property name used to display item names in dialogs |
| `nameFormatter` | Function | `null` | Custom formatter for item names in dialogs; overrides `massActionNameField` |
| `exportFormats` | Array | `[Excel, CSV]` | Available export formats for the export dialog |
| `importOptions` | Array | `[]` | Import option definitions for the import dialog |
| `showFormDialog` | Boolean | `true` | Whether to show the built-in form dialog for Add/Edit |
| `useAdvancedFormDialog` | Boolean | `false` | Use `CnAdvancedFormDialog` instead of `CnFormDialog` for Add/Edit |
| `createOverride` | Function | `null` | Opt-in async create hook. When set, a **create** confirmed from the built-in form dialog calls `await createOverride(formData, ctx)` instead of the store / self-store `saveObject` — the override owns persistence (e.g. a contact-aware endpoint that fills a required FK) and returns the created object. Create-only (edits fall through). `ctx` is `{ register, schema, objectType, effectiveSchema }`. Unchanged behaviour when absent. |
| `showViewAction` | Boolean | `true` | Whether to add a View row action |
| `showEditAction` | Boolean | `true` | Whether to add an Edit row action |
| `showCopyAction` | Boolean | `true` | Whether to add a Copy row action |
| `showDeleteAction` | Boolean | `true` | Whether to add a Delete row action |
| `excludeFields` | Array | `[]` | Field keys to exclude from the form dialog |
| `includeFields` | Array | `null` | Field keys to include in the form dialog (whitelist) |
| `fieldOverrides` | Object | `{}` | Per-field config overrides passed to `CnFormDialog` |
| `customComponents` | Object | `null` | Custom-component / handler registry. When set, takes precedence over the injected `cnCustomComponents` from CnAppRoot. Used to resolve `actions[].handler` registry names declared in the manifest (manifest-actions-dispatch). |
| `showViewToggle` | Boolean | `true` | Whether to show the Cards/Table view toggle |
| `inlineSearch` | Boolean | `false` | Show an inline search field in the actions bar (in addition to / instead of the sidebar search). Fed from the manifest as `pages[].config.inlineSearch`. |
| `searchPlaceholder` | String | `''` | Placeholder for the inline search field (manifest `config.searchPlaceholder`). |
| `cardsLabel` | String | `''` | Label for the cards view-toggle option (manifest `config.cardsLabel`, e.g. "Tiles"). |
| `tableLabel` | String | `''` | Label for the table view-toggle option (manifest `config.tableLabel`, e.g. "List"). |
| `cardsIcon` | String | `''` | MDI icon name for the cards view-toggle option (manifest `config.cardsIcon`). |
| `tableIcon` | String | `''` | MDI icon name for the table view-toggle option (manifest `config.tableIcon`). |
| `filterMenu` | Boolean | `false` | Show a filter menu (funnel button) in the table header listing each enum/badge column's values as toggleable facet filters — a compact alternative to the facet sidebar. Fed from the manifest as `pages[].config.filterMenu`. |
| `columnMenu` | Boolean | `false` | Show a column menu (columns button) in the table header listing every governed column as a toggleable checkbox — a compact, in-table alternative to the sidebar's Columns tab. Fed from the manifest as `pages[].config.columnMenu`. |
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
| `register` | String | `''` | Effective register slug for the page. Forwarded as a prop to the resolved `cardComponent` so bespoke card UIs can match the schema → register pair. Manifest-driven path: `pages[].config.register` flows in via `CnPageRenderer`. With `schema` set and no `objects` prop it also activates **self-fetch mode** (see below). |
| `filter` | Object | `null` | Self-fetch mode only — a base filter applied to every fetch as a *fixed* filter. String values `"@route.<name>"` / `":<name>"` resolve to `$route.params[<name>]`; others pass through. Fed from `pages[].config.filter`. No effect when `objects` is supplied. |
| `quickFilters` | Array | `null` | Self-fetch mode only — `{label, filter, default?, icon?}` tabs rendered above the table (see `CnQuickFilterBar`). The active tab's `filter` is merged into every fetch after `filter` (so the tab wins) and before user `activeFilters`. First entry with `default:true` (else index 0) is active on mount; switching tabs emits `@quick-filter-change`. Fed from `pages[].config.quickFilters`. |
| `quickFilterMode` | String | `'chips'` | How the quick filters render: `'chips'` (pill strip) or `'dropdown'` (a single `NcSelect`). Fed from `pages[].config.quickFilterMode`. |
| `quickFilterMultiple` | Boolean | `false` | Allow several quick filters active at once; selected tabs' filters are OR-ed into the fetch (same field → `field[]=` array). Fed from `pages[].config.quickFilterMultiple`. |
| `cardComponent` | String | `''` | Optional name of a consumer-provided card component (registered in the `customComponents` registry on `CnAppRoot`) to render in place of the default `CnObjectCard` when the page is in card-grid view mode. Resolution priority: `#card` scoped slot → `cardComponent` registry entry → default `CnObjectCard`. Unknown names log `console.warn` once and fall back to the default. |
| `customComponents` | Object | `null` | Optional explicit `customComponents` registry. Overrides the registry injected from `CnAppRoot` via `cnCustomComponents`. Mostly used by unit tests; production consumers register components on `CnAppRoot` instead. |
| `subscribe` | Boolean | `true` | Self-fetch mode only. When `register` + `schema` are set (and no `objects` prop), the page subscribes to the collection's `or-collection-{register}-{schema}` live-update scope on mount and refetches on an update event; released on unmount. Set `false` (manifest: `config.subscribe: false`) for static / read-once views. No-op in consumer-managed mode or on stores without live-updates support. |

## Self-fetch mode (manifest `type:"index"` pages)

A manifest `type:"index"` page reaches `CnIndexPage` with `register` + `schema`
from `config` but never an `objects` prop. When `register` **and** `schema` are
set **and** the caller did not pass `objects`, `CnIndexPage` self-fetches: it
derives `objectType = '${register}-${schema}'`, registers it in the object
store, and drives the whole list via [`useListView`](../../composables/useListView.js)
(collection fetch, search/sort/page/limit, facet filters, schema load, sidebar
wiring, the `on*` handlers). `schema` may then be a **string slug** — the
resolved schema object is used for column generation.

`config.filter` (the [`filter` prop](#additional-props)) is merged into every
fetch as a *fixed* filter the user's facet selections can't override, with
`"@route.<name>"` / `":<name>"` values resolved from `$route.params` — so a
list nested under a parent route (`/forms/:id/submissions`) is a fully
declarative page. When `objects` **is** supplied (every existing consumer),
nothing changes — no store is touched and `filter` has no effect.

## Named entity sources (`config.entitySource`) — lists that are not OpenRegister objects

Self-fetch needs a `register` + `schema` pair. Some lists have neither: a flow
definition is deliberately **not** stored as an OpenRegister object, so an
index page had nothing to bind to. Those lists became bespoke `type:"custom"`
pages whose only real job was loading rows from somewhere else and passing them
down — which is how three apps ended up shipping the same ~270-line wrapper,
differing only in an app-id string.

`entitySource` is the third mode. It is deliberately **not** called `source`:
that key is already taken on page config and is polymorphic — a URL string in
some manifests, an object with `params` in others — so reusing it would give
one key two meanings. The manifest names a registered source and the
index loads it:

```json
{
  "id": "Flows",
  "route": "/flows",
  "type": "index",
  "config": { "entitySource": "flows", "app": "dossiq" }
}
```

The source supplies what an index cannot infer — how to load, where the rows
are, and default columns and row actions — so a manifest need not restate them.
A manifest that **does** set `columns` still wins; the source only fills gaps.

Precedence, in order:

1. Non-empty `objects` — a parent handing rows down is never overridden.
2. `entitySource` — wins over `register`/`schema`, because naming both is a
   contradiction, and self-fetching would render the **wrong** list rather than
   an obviously empty one. Self-fetch is suppressed outright, so no discarded
   request is issued.
3. `register` + `schema` — ordinary self-fetch.

An unknown entity-source name warns to the console and renders an empty list. It does
**not** throw, and it does **not** go quiet: a silent empty table is
indistinguishable from a source that genuinely has no rows.

Sources are registered in
[`indexSources.js`](../../composables/indexSources.js). Adding one is a data
change there rather than a branch in this component.

## Bespoke card-grid via `cardComponent`

When the schema-driven `CnObjectCard` is not enough — e.g. the
softwarecatalog `Organisaties` page needs a profile-style card with
logo, contactpersoon block, and a CTA button — register the card
component on `CnAppRoot` and reference it by name in the manifest:

```js {static}
// src/customComponents.js
import OrganisatieCard from './components/cards/OrganisatieCard.vue'
export const customComponents = { OrganisatieCard }
```

```vue {static}
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
## AI Chat Companion — Context push

`CnIndexPage` writes into the `cnAiContext` reactive object injected by the nearest `CnAppRoot` ancestor so the AI companion can refer to the current register and schema when answering user questions.

| Field written | When | Value |
|---|---|---|
| `pageKind` | `created()` and on prop changes | `'index'` |
| `registerSlug` | `created()` and on prop changes | value of the `register` prop |
| `schemaSlug` | `created()` and on prop changes | value of the `schema` prop |
| `objectUuid` | `beforeDestroy()` only | cleared to `undefined` |

In `beforeDestroy()` all three fields are reset (`pageKind → 'custom'`, `registerSlug` and `schemaSlug` cleared) so the companion reverts to the default idle context when the user navigates away.

No new props are required on `CnIndexPage`.

## Slots

| Slot | Scope | Description |
|------|-------|-------------|
| `delete-dialog` | `{ show, item, confirm, close }` | Replace the single-item delete dialog |
| `copy-dialog` | `{ show, item, confirm, close }` | Replace the single-item copy dialog |
| `form-dialog` | `{ show, item, schema, confirm, close }` | Replace the create/edit form dialog |
| `form-fields` | `{ fields, formData, errors, updateField }` | Replace form content inside the built-in `CnFormDialog` |
| `import-fields` | `{ file }` | Extra fields in the import dialog |
| `empty` | — | Custom empty state content |
| `card` | `{ object, selected }` | Custom card template for card view |
| `row-actions` | `{ row }` | Custom row actions |
| `column-{key}` | `{ row, value }` | Custom cell renderer for a specific column |

## Page-level header actions (manifest)

`CnIndexPage` accepts a `headerActions` prop (mirrored by the
`pages[].config.headerActions[]` manifest key) so manifest authors can
declare custom items inside `CnActionsBar`'s overflow dropdown without
dropping to a JSX wrapper. The shape mirrors the row-level `actions[]`,
but handlers receive **no row context** — the action is page-level.

```vue
<CnIndexPage
  :register="register"
  :schema="schema"
  :header-actions="[
    { id: 'view-logs', label: 'View logs', icon: 'icon-history', handler: 'navigate', route: 'SourceLogs' },
  ]"
  @header-action="onHeaderAction" />
```

Manifest equivalent:

```json
{
  "id": "sources",
  "type": "index",
  "config": {
    "register": "oc",
    "schema": "sources",
    "headerActions": [
      { "id": "view-logs", "label": "View logs", "icon": "icon-history", "handler": "navigate", "route": "SourceLogs" }
    ]
  }
}
```

Handler dispatch keywords (same as row-level `actions[].handler`):

| Keyword | Behaviour |
| --- | --- |
| `navigate` | `$router.push({ name: action.route })` (no `params.id`) AND `@header-action` emits |
| `emit` | Only `@header-action({ action: id, id })` emits (no handler call) |
| `none` | No-op + suppresses the `@header-action` emit |
| Registry name | `customComponents[name]({ actionId: id })` is called AND `@header-action` emits |
| Unknown registry name | Silent fall-through to emit-only |

Reserved built-in ids (`refresh`, `import`, `export`, `copy`, `delete`)
are dropped from the rendered list with a `console.warn` so manifest
authors cannot accidentally shadow CnActionsBar's built-in overflow
items.

## Request-a-feature

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `showRequestFeature` | Boolean | `true` | Show the built-in "Request a feature" entry in the CnActionsBar overflow. Opens CnSuggestFeatureModal with `surface: "index:<schema>"`. Requires a CnAppRoot ancestor (repo inject). |

## Documentation link

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `documentationUrl` | String | `''` | When set, adds a **Documentation** entry to the CnActionsBar overflow (before Request a feature) that opens the link in a new tab. Empty hides it. |
| `documentationLabel` | String | `''` | Optional override for the Documentation entry label; empty falls back to CnActionsBar's translated "Documentation". |

## Action handlers (manifest-actions-dispatch)

Each row-action object in `actions[]` may declare a string `handler`. The value resolves through CnIndexPage's `effectiveCustomComponents` registry (the same one driving `type:'custom'` pages and the `cardComponent` prop). Reserved keywords short-circuit registry lookup:

| `handler` value | Behaviour |
|-----------------|-----------|
| `"navigate"` | Calls `$router.push({ name: action.route, params: { id: row[rowKey] } })`. `route` is required. An optional `action.params` object is merged over the default (see [Navigate params](#navigate-params)). |
| `"emit"` | Skips any registry call; CnIndexPage still bubbles `@action`. |
| `"none"` | Disables the click entirely. CnIndexPage suppresses both the call AND the `@action` emit. |
| Registry name (`/^[A-Za-z][A-Za-z0-9_]*$/`) | Looked up in `customComponents`. If a function, invoked as `fn({ actionId, item })` on row click. If a non-function or missing, falls back to `@action`-only with a `console.warn`. |
| Function (programmatic) | Used as-is. Back-compat for v1 row-action APIs that pass a function directly. |
| Unset | Default — CnIndexPage emits `@action` with the click payload and the consumer decides. |

### Example: manifest declaring a handler

```json
{
	"version": "1.3.0",
	"pages": [{
		"id": "queues",
		"route": "/queues",
		"type": "index",
		"title": "Queues",
		"config": {
			"register": "pipelinq",
			"schema": "queue",
			"actions": [
				{ "id": "process", "label": "Process queue", "handler": "queueProcessHandler" },
				{ "id": "open",    "label": "Open detail",   "handler": "navigate", "route": "queues-detail" },
				{ "id": "audit",   "label": "Audit",         "handler": "emit" },
				{ "id": "noop",    "label": "Read-only",     "handler": "none" }
			]
		}
	}]
}
```

```js
// src/customComponents.js — passed to CnAppRoot
export default {
	queueProcessHandler({ actionId, item }) {
		// Fires when the row-action button is clicked.
		console.log('processing queue', item.id, '(from', actionId, ')')
	},
}
```

### Navigate params

`handler: "navigate"` always seeds `params` with `{ id: row[rowKey] }`, so the common
"open this row's detail page" action needs **no** `params` at all:

```json
{ "id": "open", "label": "Open detail", "handler": "navigate", "route": "queues-detail" }
```

Declare `action.params` only to add or override route params. Each string value runs
the `{field}` row-token grammar:

| Declared value | Resolves to | Notes |
|----------------|-------------|-------|
| `"{id}"` | `row.id` | Exact-token form — the value's **type is preserved**, so a numeric id stays a number. |
| `"{name}"` | `row.name` | Any row field, not just the row key. |
| `"run-{id}"` | `"run-42"` | Embedded tokens interpolate as text. |
| `"new"` | `"new"` | No braces → literal. This is what makes a "New X" action (`params: { "id": "new" }`) navigate to the create route. |

A token naming a field the row does not carry is **dropped** with a `console.warn`
(so `id` falls back to the row id) rather than being pushed as a literal
`%7Bid%7D` path segment.

## Map view mode

Alongside `table` and `cards`, CnIndexPage offers an opt-in `map` view mode — a view-toggle segment that plots the current filtered rows on a `CnMapWidget`. Opt in via the `mapConfig` prop (or manifest `config.map`), which carries the geometry mapping `{ latField, lngField, geoField?, popupField?, center? }`; coordinates are read from each object's metadata (typically the OpenRegister `@self` block). Customise the toggle segment with `mapLabel` and `mapIcon`. The map segment appears automatically when `mapConfig` is non-empty, or gate it explicitly with the `viewModes` whitelist (e.g. `["table", "cards", "map"]`). A marker click emits the same `@row-click` payload as a table row-click, so detail-page navigation is identical across all view modes.

## List view & sorting

The list view (`view-mode="list"`) and standalone sort dropdown add these props:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `availableViewModes` | Array | `['cards','table']` | View-toggle segments; add `list` to offer the list view. |
| `listLabel` | String | `''` | Label for the list view-toggle option. |
| `listIcon` | String | `''` | MDI icon for the list view-toggle option. |
| `listConfig` | Object | `{}` | Field mapping for the default list rows (`CnObjectRow`). |
| `listComponent` | String | `''` | Custom row component (customComponents registry). |
| `showSortSelect` | Boolean | `false` | Show a standalone sort dropdown in the actions bar. |
| `sortSelectOptions` | Array | `[]` | Options `{ value, label }` for the sort dropdown. |
| `sortSelectValue` | String | `''` | Selected sort dropdown value (controlled). |

The `#list-item`, `#row-icon`, `#row-badges`, and `#row-actions` slots override the list rows (see [CnObjectList](./cn-object-list.md)). Emits `@sort-change` with the chosen sort value.

## Folder sidebar

Set the `folderSidebar` config to render a folder navigation pane left of the list. Selecting a folder filters the list by the config's `filterField` (via the self-fetch filter); "All" clears it. Emits `@folder-change` with the selected id (and `@folder-create` when the opt-in New-folder button is used).

Sources: `register` (fetch the folder list from an OpenRegister `register`/`schema`, mapping `idField`/`nameField`), `field` (distinct values of the current rows' `field`), `custom` (explicit `folders`), or `files` (Nextcloud folders). Example — case types as folders that filter cases:

```json
"folderSidebar": {
  "source": "register", "register": "procest", "schema": "caseType",
  "idField": "@self.uuid", "nameField": "title",
  "filterField": "caseType", "allLabel": "All cases"
}
```

