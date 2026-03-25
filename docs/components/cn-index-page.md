---
sidebar_position: 2
---

# CnIndexPage

The main list page component. Combines a data table (or card grid), filter bar, pagination, mass actions, and CRUD dialogs into a single schema-driven page.

**Wraps**: NcEmptyContent, NcLoadingIcon (from @nextcloud/vue)

![CnIndexPage showing the full list page with filter bar, data table, and right sidebar](/img/screenshots/cn-index-page.png)

![CnIndexPage showing the full list page with filter bar, data table with rows, and right sidebar](/img/screenshots/cn-index-page.png)

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | String | *(required)* | Page title |
| `description` | String | `''` | Optional subtitle |
| `schema` | Object | `null` | OpenRegister schema for auto-generating columns, filters, and form fields |
| `objects` | Array | `[]` | Row data |
| `pagination` | Object | `null` | Pagination state (`\{ currentPage, totalPages, totalItems, pageSize \}`) |
| `loading` | Boolean | `false` | Loading state |
| `selectable` | Boolean | `true` | Enable row selection checkboxes |
| `selectedIds` | Array | `[]` | Currently selected IDs |
| `viewMode` | String | `'table'` | `'table'` or `'cards'` |
| `sortKey` | String | `null` | Current sort column key |
| `sortOrder` | String | `'asc'` | `'asc'` or `'desc'` |
| `rowKey` | String | `'id'` | Unique row identifier field |
| `columns` | Array | `[]` | Manual column definitions (overrides schema) |
| `excludeColumns` | Array | `[]` | Schema columns to hide |
| `includeColumns` | Array | `null` | Schema columns to show (whitelist) |
| `columnOverrides` | Object | `\{\}` | Per-column overrides |
| `actions` | Array | `[]` | Custom row action definitions |
| `emptyText` | String | `'No items found'` | Empty state message |
| `rowClass` | Function | `null` | CSS class provider for rows |
| `addLabel` | String | `''` | Add button label |
| `inlineActionCount` | Number | `2` | Number of inline action buttons before overflow menu |
| `showMassImport` | Boolean | `true` | Show mass import action |
| `showMassExport` | Boolean | `true` | Show mass export action |
| `showMassCopy` | Boolean | `true` | Show mass copy action |
| `showMassDelete` | Boolean | `true` | Show mass delete action |
| `massActionNameField` | String | `'title'` | Field for display names in mass action dialogs |
| `exportFormats` | Array | `[]` | Available export formats |
| `importOptions` | Array | `[]` | Import dialog options |
| `showFormDialog` | Boolean | `true` | Enable built-in create/edit form dialog |
| `useAdvancedFormDialog` | Boolean | `false` | Use [CnAdvancedFormDialog](./cn-advanced-form-dialog.md) for create/edit (properties table, JSON tab, optional metadata) instead of CnFormDialog |
| `showEditAction` | Boolean | `true` | Show edit row action |
| `showCopyAction` | Boolean | `true` | Show copy row action |
| `showDeleteAction` | Boolean | `true` | Show delete row action |
| `excludeFields` | Array | `[]` | Form fields to hide |
| `includeFields` | Array | `null` | Form fields to show (whitelist) |
| `fieldOverrides` | Object | `\{\}` | Per-field overrides |
| `showViewToggle` | Boolean | `true` | Show table/card view toggle |
| `store` | Object | `null` | Store instance for automatic save integration. When provided with `objectType`, the form dialog saves directly to the store via `store.saveObject()` instead of only emitting `create`/`edit`. The object type must already be registered in the store via `registerObjectType()`. |
| `objectType` | String | `''` | Object type slug for store integration (e.g. `${registerId}-${schemaId}`). Required when `store` is set — a console warning is emitted if missing. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `add` | — | Add button clicked (backward compat) |
| `create` | `formData` | Form dialog create confirmed. When store integration is active, payload is the saved object returned by the store. |
| `edit` | `formData` | Form dialog edit confirmed. When store integration is active, payload is the saved object returned by the store. |
| `delete` | `id` | Single delete confirmed |
| `copy` | `\{ id, newName \}` | Single copy confirmed |
| `mass-delete` | `ids[]` | Mass delete confirmed |
| `mass-copy` | `\{ ids, pattern \}` | Mass copy confirmed |
| `mass-export` | `\{ ids, format \}` | Mass export confirmed |
| `mass-import` | `importData` | Mass import confirmed |
| `refresh` | — | Refresh button clicked |
| `row-click` | `row` | Row or card clicked |
| `sort` | `\{ key, order \}` | Sort changed |
| `page-changed` | `pageNum` | Pagination page changed |
| `page-size-changed` | `size` | Page size changed |
| `select` | `ids[]` | Selection changed |
| `action` | `\{ action, row \}` | Custom row action triggered |

## Slots

| Slot | Scope | Description |
|------|-------|-------------|
| `#below-header` | — | Content rendered between the page header and the actions bar (e.g. status banners, alerts) |
| `#mass-actions` | `\{ count, selectedIds \}` | Extra mass action buttons |
| `#action-items` | — | Extra action bar buttons |
| `#header-actions` | — | Extra header buttons |
| `#delete-dialog` | `\{ item, close \}` | Replace single-item delete dialog |
| `#copy-dialog` | `\{ item, close \}` | Replace single-item copy dialog |
| `#form-dialog` | `\{ item, schema, close \}` | Replace create/edit dialog (any variant) |
| `#form-fields` | `\{ fields, formData, errors, updateField \}` | Form content override (CnFormDialog only; ignored when `useAdvancedFormDialog` is true) |
| `#field-\{key\}-option` | *option object properties* | Custom dropdown option rendering for a select field (forwarded to NcSelect `#option`) |
| `#field-\{key\}-selected-option` | *option object properties* | Custom selected option display for a select field (forwarded to NcSelect `#selected-option`) |
| `#import-fields` | `\{ file \}` | Extra import dialog fields |
| `#empty` | — | Custom empty state |
| `#card` | `\{ object, selected \}` | Custom card template (cards view) |
| `#row-actions` | `\{ row \}` | Custom row actions |
| `#column-\{key\}` | `\{ row, value \}` | Custom cell renderer per column |

## Public Methods

| Method | Description |
|--------|-------------|
| `setFormResult(result)` | Set form dialog result (`\{ success?, error? \}`) |
| `setSingleDeleteResult(result)` | Set delete dialog result |
| `setSingleCopyResult(result)` | Set copy dialog result |
| `setMassDeleteResult(result)` | Set mass delete result |
| `setMassCopyResult(result)` | Set mass copy result |
| `setExportResult(result)` | Set export dialog result |
| `setImportResult(result)` | Set import dialog result |
| `openFormDialog(item)` | Programmatically open form (null = create) |

## Usage

```vue
<template>
  <CnIndexPage
    :title="schema?.title || 'Contacts'"
    :schema="schema"
    :objects="objects"
    :pagination="pagination"
    :loading="loading"
    @row-click="onRowClick"
    @create="onCreate"
    @edit="onEdit"
    @delete="onDelete"
    @refresh="onRefresh"
    @page-changed="onPageChanged"
    @sort="onSort">
    <!-- Custom status column rendering -->
    <template #column-status="{ row, value }">
      <CnStatusBadge :label="value" :colorMap="statusColors" />
    </template>
  </CnIndexPage>
</template>
```

### Using the advanced form dialog

Set `use-advanced-form-dialog` to use [CnAdvancedFormDialog](./cn-advanced-form-dialog.md) for Add/Edit (properties table, JSON tab, optional metadata). The same `@create` and `@edit` events and `setFormResult()` apply.

```vue
<CnIndexPage
  title="Items"
  :schema="schema"
  :objects="items"
  :pagination="pagination"
  :loading="loading"
  use-advanced-form-dialog
  @create="onCreate"
  @edit="onEdit"
  @refresh="fetchItems"
/>
```

### Store integration

Set `store` and `objectType` to have the form dialog save directly to the store. The object type must be registered in the store (via `registerObjectType()`) before passing the store here. On save, `store.saveObject(objectType, formData)` is called; the result phase is shown automatically and `@create` / `@edit` are still emitted with the saved object on success.

```vue
<CnIndexPage
  title="Clients"
  :schema="schema"
  :objects="clients"
  :pagination="pagination"
  :loading="loading"
  :store="objectStore"
  object-type="register-schema"
  @refresh="fetchClients"
/>
```

No `@create` / `@edit` handlers or `setFormResult()` calls are needed when store integration is active. You can still listen to `@create` / `@edit` for side effects (e.g. refreshing the list) — the payload will be the object returned by the store.

## Two-Phase Pattern

CnIndexPage uses the two-phase dialog pattern for all actions:

1. User triggers action → dialog opens
2. App handles the event (API call)
3. App calls `setResult()` on the component ref

```vue
<template>
  <CnIndexPage ref="indexPage" @delete="onDelete" />
</template>

<script>
export default {
  methods: {
    async onDelete(id) {
      try {
        await this.objectStore.deleteObject('contact', id)
        this.$refs.indexPage.setSingleDeleteResult({ success: true })
      } catch (error) {
        this.$refs.indexPage.setSingleDeleteResult({ error: error.message })
      }
    },
  },
}
</script>
```
