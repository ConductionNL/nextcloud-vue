---
sidebar_position: 2
---

import Playground from '@site/src/components/Playground'
import GeneratedRef from './_generated/CnIndexPage.md'

# CnIndexPage

The main list page component. Combines a data table (or card grid), filter bar, pagination, mass actions, CRUD dialogs, and a right-click context menu into a single schema-driven page.

**Wraps**: NcEmptyContent, NcLoadingIcon (from @nextcloud/vue), CnContextMenu

## Try it

<Playground component="CnIndexPage" />

![CnIndexPage showing the full list page with filter bar, data table, and right sidebar](/img/screenshots/cn-index-page.png)

![CnIndexPage showing the full list page with filter bar, data table with rows, and right sidebar](/img/screenshots/cn-index-page.png)

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | String | *(required)* | Page title |
| `description` | String | `''` | Optional subtitle |
| `showTitle` | Boolean | `false` | Show the page header (icon, title, description) inline above the table. When `false` (default), the title is shown in the sidebar header instead. |
| `icon` | String | `''` | MDI icon name for the page header. Defaults to `schema.icon` when a schema is provided. |
| `schema` | Object | `null` | OpenRegister schema for auto-generating columns, filters, and form fields |
| `objects` | Array | `[]` | Row data |
| `pagination` | Object | `null` | Pagination state (`\{ currentPage, totalPages, totalItems, pageSize \}`) |
| `loading` | Boolean | `false` | Loading state |
| `selectable` | Boolean | `true` | Enable row selection checkboxes |
| `selectedIds` | Array | `[]` | Currently selected IDs |
| `viewMode` | String | `'table'` | `'table'` or `'cards'` |
| `sortKey` | String | `null` | Current sort column key. `null` means no column is actively sorted. |
| `sortOrder` | String | `'asc'` | `'asc'`, `'desc'`, or `null` (no sort) |
| `rowKey` | String | `'id'` | Unique row identifier field |
| `columns` | Array | `[]` | Manual column definitions (overrides schema) |
| `excludeColumns` | Array | `[]` | Schema columns to hide |
| `includeColumns` | Array | `null` | Schema columns to show (whitelist) |
| `columnOverrides` | Object | `\{\}` | Per-column overrides |
| `actions` | Array | `[]` | Custom row action definitions. Each entry accepts the runtime `{label, icon, handler, …}` shape (function-typed `handler` fires directly) AND the manifest shape with a string `handler` resolved through `customComponents` — see "Action handlers" below. |
| `customComponents` | Object | `null` | Custom-component / handler registry. When set takes precedence over the injected `cnCustomComponents` from a CnAppRoot ancestor. Used to resolve `actions[].handler` registry names (manifest-actions-dispatch). |
| `emptyText` | String | `'No items found'` | Empty state message |
| `rowClass` | Function | `null` | CSS class provider for rows |
| `addLabel` | String | `''` | Add button label |
| `inlineActionCount` | Number | `2` | Number of inline action buttons before overflow menu |
| `showMassImport` | Boolean | `true` | Show mass import action |
| `showMassExport` | Boolean | `true` | Show mass export action |
| `showMassCopy` | Boolean | `true` | Show mass copy action |
| `showMassDelete` | Boolean | `true` | Show mass delete action |
| `massActionNameField` | String | `'title'` | Field for display names in mass action dialogs |
| `nameFormatter` | Function | `null` | Optional function `(item) => string` to format item names in dialogs. Overrides `massActionNameField` when provided. Passed to all delete and copy dialogs. |
| `exportFormats` | Array | `[]` | Available export formats |
| `importOptions` | Array | `[]` | Import dialog options |
| `showFormDialog` | Boolean | `true` | Enable built-in create/edit form dialog |
| `useAdvancedFormDialog` | Boolean | `false` | Use [CnAdvancedFormDialog](./cn-advanced-form-dialog.md) for create/edit (properties table, JSON tab, optional metadata) instead of CnFormDialog |
| `showViewAction` | Boolean | `true` | Show the built-in View row action. Emits a dedicated `@view` event — independent of `@row-click`. Set to `false` when the row has no separate "open detail" target. |
| `showEditAction` | Boolean | `true` | Show edit row action |
| `showCopyAction` | Boolean | `true` | Show copy row action |
| `showDeleteAction` | Boolean | `true` | Show delete row action |
| `excludeFields` | Array | `[]` | Form fields to hide |
| `includeFields` | Array | `null` | Form fields to show (whitelist) |
| `fieldOverrides` | Object | `\{\}` | Per-field overrides |
| `showAdd` | Boolean | `true` | Show the Add button in the actions bar |
| `addDisabled` | Boolean | `false` | Disable the Add button (e.g. when required selections are missing) |
| `refreshDisabled` | Boolean | `false` | Disable the refresh button (e.g. when required selections are missing) |
| `showViewToggle` | Boolean | `true` | Show table/card view toggle |
| `store` | Object | `null` | Store instance for automatic save integration. When provided with `objectType`, the form dialog saves directly to the store via `store.saveObject()` instead of only emitting `create`/`edit`. The object type must already be registered in the store via `registerObjectType()`. |
| `objectType` | String | `''` | Object type slug for store integration (e.g. `${registerId}-${schemaId}`). Required when `store` is set — a console warning is emitted if missing. |
| `sidebar` | Object | `null` | Manifest-driven sidebar configuration. When set with `enabled: true`, CnIndexPage auto-mounts an embedded `CnIndexSidebar` and forwards its props. Shape: `\{ enabled, show?, columnGroups?, facets?, showMetadata?, search? \}`. `show` (default `true`) is the visibility gate — set `false` to hide the configured sidebar without removing config. When unset (the default), the legacy slot-based pattern is preserved — consumers wire their own `CnIndexSidebar` at the App.vue level. See [Manifest-driven sidebar](#manifest-driven-sidebar) below. |
| `searchValue` | String | `''` | Current search term forwarded to the embedded sidebar (only relevant when `sidebar.enabled`). |
| `visibleColumns` | Array | `null` | Currently visible column keys forwarded to the embedded sidebar (only relevant when `sidebar.enabled`). |
| `activeFilters` | Object | `\{\}` | Currently active facet filters `\{ fieldName: [values] \}` forwarded to the embedded sidebar (only relevant when `sidebar.enabled`). |

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
| `row-click` | `row` | Row or card clicked. Conceptually distinct from `view` — handle row interaction here (selection, expand, drilldown). |
| `view` | `row` | Built-in View row action triggered. Conceptually "open the detail view of this row"; bind alongside `row-click` (with the same handler) when click-to-view is desired. |
| `sort` | `\{ key, order \}` | Sort changed. Cycles through `asc → desc → null` (disabled). When cleared, both `key` and `order` are `null`. |
| `page-changed` | `pageNum` | Pagination page changed |
| `page-size-changed` | `size` | Page size changed |
| `select` | `ids[]` | Selection changed |
| `action` | `\{ action, row \}` | Custom row action triggered |
| `search` | `term` | Search input changed in the embedded sidebar (only emitted when `sidebar.enabled`). |
| `columns-change` | `keys[]` | Visible columns changed in the embedded sidebar (only emitted when `sidebar.enabled`). |
| `filter-change` | `\{ key, values \}` | Facet filter changed in the embedded sidebar (only emitted when `sidebar.enabled`). |

## Slots

| Slot | Scope | Description |
|------|-------|-------------|
| `#below-header` | — | Content rendered between the page header and the actions bar (e.g. status banners, alerts) |
| `#mass-actions` | `\{ count, selectedIds \}` | Extra mass action buttons |
| `#action-items` | — | Extra action bar buttons |
| `#header-actions` | — | Extra header buttons |
| `#delete-dialog` | `\{ item, close \}` | Replace single-item delete dialog |
| `#copy-dialog` | `\{ item, close \}` | Replace single-item copy dialog |
| `#form-dialog` | `\{ show, item, schema, close \}` | Replace create/edit dialog (any variant). Use `show` as a `v-if` guard so the dialog unmounts after `close`; otherwise an always-mounted override re-opens when its internal close animation finishes. |
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

### Custom item names in dialogs

When items don't have a simple name field (like audit trails that only have an ID), use `nameFormatter` to control how items are displayed in delete and copy dialogs:

```vue
<CnIndexPage
  title="Audit Trails"
  :objects="auditTrails"
  :columns="columns"
  :pagination="pagination"
  :name-formatter="(item) => t('openregister', 'Audit Trail #{id}', { id: item.id })"
  @delete="onDelete"
  @refresh="onRefresh" />
```

This formatter is passed through to `CnDeleteDialog`, `CnMassDeleteDialog`, `CnCopyDialog`, and `CnMassCopyDialog`. It takes precedence over `massActionNameField`.

### Read-only listing

Set `:show-add="false"` to hide the Add button. Combine with disabled row actions and mass actions for a fully read-only page.

```vue
<CnIndexPage
  title="Entities"
  :objects="entities"
  :columns="columns"
  :pagination="pagination"
  :loading="loading"
  :show-add="false"
  :selectable="false"
  :show-edit-action="false"
  :show-copy-action="false"
  :show-delete-action="false"
  :show-form-dialog="false"
  :show-mass-import="false"
  :show-mass-export="false"
  :show-mass-copy="false"
  :show-mass-delete="false"
  @row-click="onRowClick"
  @refresh="onRefresh"
  @page-changed="onPageChanged" />
```

## Context Menu

Right-clicking any table row opens a context menu at the cursor position with the same actions as the three-dot row action menu. The context menu renders the `mergedActions` computed (app-provided actions + built-in Edit/Copy/Delete), so it stays in sync automatically — no app-side changes needed.

Powered by the [`CnContextMenu`](./cn-context-menu.md) component and [`useContextMenu`](../utilities/composables/use-context-menu.md) composable. The composable handles cursor positioning via CSS custom properties; the component renders the NcActions menu.

- Each action's `disabled` state (boolean or function) is respected
- Destructive actions are styled with `--color-error`
- The menu closes on action click or outside click, cleaning up the CSS properties and data attribute
- Works out of the box for all consumer apps (OpenRegister, Doriath, etc.)

## Manifest-driven sidebar

Set the `sidebar` prop to an object to auto-mount an embedded `CnIndexSidebar`. This keeps the sidebar reachable from `manifest.json` (`pages[].config.sidebar`) without consumer apps wiring it manually.

```vue
<CnIndexPage
  title="Decisions"
  :schema="schema"
  :objects="decisions"
  :sidebar="{
    enabled: true,
    columnGroups: extraColumnGroups,
    facets: facetData,
    showMetadata: true,
    search: { searchPlaceholder: 'Find decisions...', filtersLabel: 'Refine' },
  }"
  :search-value="searchTerm"
  :visible-columns="visibleColumns"
  :active-filters="activeFilters"
  @search="onSearch"
  @columns-change="onColumnsChange"
  @filter-change="onFilterChange" />
```

| `sidebar` field | Forwarded to `CnIndexSidebar` as | Notes |
|------------------|----------------------------------|-------|
| `enabled` | (existence gate) | When `false` (or missing), the embedded sidebar is NOT mounted — the legacy slot-based pattern still works. |
| `show` | (visibility gate) | Defaults to `true`. When `false`, the embedded sidebar is suppressed even if `enabled: true`. See [show vs enabled](#show-vs-enabled) below. |
| `columnGroups` | `columnGroups` | Extra column groups beyond schema properties + Metadata. |
| `facets` | `facetData` | Live facet data `\{ fieldName: \{ values: [\{value, count\}] \} \}`. |
| `showMetadata` | `showMetadata` | Defaults to `true`. |
| `search` | (spread via `v-bind`) | Sub-fields like `searchPlaceholder`, `searchTabLabel`, `searchLabel`, `filtersLabel` map 1:1 onto matching `CnIndexSidebar` props. |

`@search`, `@columns-change`, and `@filter-change` from the embedded sidebar re-emit on `CnIndexPage`, so consumer event handling stays at the page level.

If you prefer to mount your own `CnIndexSidebar` (e.g. at the App.vue level for cross-page state), simply leave `sidebar` unset — the legacy slot-based pattern is unchanged.

### show vs enabled

`enabled` and `show` answer different questions and are intentionally
kept distinct:

- **`enabled`** — *existence gate*: does this page configure an
  embedded sidebar at all? When `false` (or unset), the auto-mount
  code path is bypassed entirely — no `<CnIndexSidebar>` is
  rendered, and the consumer's slot-based pattern stays active.
- **`show`** — *visibility gate*: should the configured sidebar be
  rendered right now? Defaults to `true`. When `false`, the sidebar
  config is preserved (so a parent watcher / feature flag can flip
  back to `true` later) but the visible surface is suppressed.

Concrete example: a consumer wants the sidebar on `wide` viewports
and hidden on `narrow` ones. Keep `enabled: true, columnGroups: [...]`
static and toggle `show` from a layout watcher — the
`columnGroups` / `facets` / `search` config is retained across
flips.

## Action handlers (manifest-actions-dispatch)

`actions[]` items declared in `pages[].config.actions` (manifest path) accept a string `handler` that resolves through the `customComponents` registry passed to `CnAppRoot` / `CnPageRenderer`. The same registry already used to resolve `headerComponent` / `actionsComponent` / slot overrides.

### Registry-name handler

Manifest declaration:

```jsonc
{
  "id": "Queues",
  "route": "/queues",
  "type": "index",
  "title": "Queues",
  "config": {
    "register": "pipelinq",
    "schema": "queue",
    "actions": [
      { "id": "process", "label": "Process queue", "handler": "queueProcessHandler" }
    ]
  }
}
```

Registry entry (e.g. `src/customComponents.js`):

```js
export function queueProcessHandler({ actionId, item }) {
  // open the right modal, dispatch a store action, etc.
  store.processQueue(item.id)
}

export default {
  // …existing component entries…
  queueProcessHandler,
}
```

When the user clicks "Process queue" on a row, CnIndexPage looks up `queueProcessHandler` in the registry, sees a function, and calls it with `{ actionId: "process", item: row }`. The page's `@action` event still fires for any external listeners.

### Reserved keywords

Three keywords short-circuit the registry lookup:

- `"navigate"` — calls `$router.push({ name: action.route, params: { id: row[rowKey] } })`. The `route` field is required when this keyword is set.
- `"emit"` — explicit no-op handler that just bubbles `@action`. Identical to leaving `handler` unset, but makes intent visible in the manifest.
- `"none"` — disables the action click entirely (no handler call, no `@action` emit).

Example:

```jsonc
{
  "actions": [
    { "id": "view", "label": "Open", "handler": "navigate", "route": "QueueDetail" },
    { "id": "z",    "label": "Z",    "handler": "emit" },
    { "id": "x",    "label": "X",    "handler": "none" }
  ]
}
```

### Fallback semantics

- Missing handler name in the registry → silent fall-through to `@action`-only (no warning; preserves v1.2 manifests).
- Non-function entry in the registry (e.g. a Vue component) → console.warn + fall-through to `@action`-only.
- Function-typed `handler` (passed via the runtime prop, NOT through the manifest) keeps working unchanged — used by the built-in `view` / `edit` / `copy` / `delete` actions.

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

## Reference (auto-generated)

The tables below are generated from the SFC source via `vue-docgen-cli`. They reflect what's actually in [`CnIndexPage.vue`](https://github.com/ConductionNL/nextcloud-vue/blob/beta/src/components/CnIndexPage/CnIndexPage.vue) — props, events, and named slots — and update automatically whenever the component changes (see [CLAUDE.md "Documenting components"](https://github.com/ConductionNL/nextcloud-vue/blob/beta/CLAUDE.md#documenting-components-enforced)).

<GeneratedRef />
