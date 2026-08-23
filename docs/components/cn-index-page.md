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
| `schema` | Object \| String | `null` | OpenRegister schema for auto-generating columns, filters, and form fields. In [self-fetch mode](#self-fetch-mode) a String is the schema **slug** — the resolved schema object then drives column generation. |
| `objects` | Array | `[]` | Row data. **Omitting this prop** while `register` + `schema` are set switches the page into [self-fetch mode](#self-fetch-mode) — it drives the list off the object store itself. |
| `filter` | Object | `null` | [Self-fetch mode](#self-fetch-mode) only — a base filter map applied to every fetch as a *fixed* filter (the user's facet filters can't override it). String values of the form `"@route.<name>"` or `":<name>"` resolve to `$route.params[<name>]`; other values pass through. Re-resolves when `$route.params` change. Fed from `pages[].config.filter` in the manifest path. No effect in consumer-managed mode. |
| `quickFilters` | Array | `null` | [Self-fetch mode](#self-fetch-mode) only — array of `\{ label, filter, default?, icon? \}` rendered as a tab strip above the table (see [CnQuickFilterBar](./cn-quick-filter-bar.md)). The active tab's `filter` is merged into every fetch *after* `filter` (the tab wins on a colliding key) and *before* the user's `activeFilters` (which still narrow within the active tab). String values follow the same `"@route.<name>"` resolution as `filter`. First entry with `default:true` (else index 0) is active on mount; switching tabs re-fetches at page 1 and emits `@quick-filter-change`. Fed from `pages[].config.quickFilters`. |
| `quickFilterMode` | String | `'chips'` | How the quick filters render: `'chips'` (pill strip) or `'dropdown'` (a single `NcSelect`; the empty-filter "All" tab is dropped). Fed from `pages[].config.quickFilterMode`. |
| `quickFilterMultiple` | Boolean | `false` | Allow several quick filters active at once. Selected tabs' filters are OR-ed together into the fetch (same field → array value → `field[]=` IN query). Fed from `pages[].config.quickFilterMultiple`. |
| `pagination` | Object | `null` | Pagination state (`\{ currentPage, totalPages, totalItems, pageSize \}`) |
| `loading` | Boolean | `false` | Loading state |
| `loadingText` | String | `'Loading…'` | Accessible label for the loading spinner (NcLoadingIcon aria-label) |
| `selectable` | Boolean | `true` | Enable row selection checkboxes |
| `rowClickToView` | Boolean | `false` | When true, a row/card click emits `row-click` (to open/navigate) even while `selectable` — selection then via the checkbox only. Manifest-driven pages set this automatically when a matching detail page exists. |
| `selectedIds` | Array | `[]` | Currently selected IDs |
| `viewMode` | String | `'table'` | `'table'`, `'cards'`, or `'map'`. The `'map'` mode is only offered when the page opts in — see [Map view mode](#map-view-mode). |
| `mapConfig` | Object | `\{\}` | Marker geometry mapping for the opt-in [map view mode](#map-view-mode), mirroring manifest `config.map` 1:1: `\{ latField, lngField, geoField?, popupField?, center? \}`. When non-empty (and not excluded by `viewModes`), a third "Map" toggle segment appears. `latField`/`lngField` are object (or `@self`) property paths (dotted paths supported); `geoField` is an alternative GeoJSON Point property that wins over lat/lng; `center` is a `[lat, lng]` fallback for an empty set. |
| `mapLabel` | String | `''` | Label for the map view-toggle segment (defaults to "Map"). Fed from `pages[].config.mapLabel`. |
| `mapIcon` | String | `''` | MDI icon name for the map view-toggle segment (defaults to the built-in map-marker icon). |
| `viewModes` | Array | `null` | Explicit whitelist of toggle segments to offer, e.g. `['table', 'cards', 'map']`. Fed from `pages[].config.viewModes`. When set it takes precedence over inferred availability (map otherwise appears iff `mapConfig` is non-empty). |
| `sortKey` | String | `null` | Current sort column key. `null` means no column is actively sorted. |
| `sortOrder` | String | `'asc'` | `'asc'`, `'desc'`, or `null` (no sort) |
| `sortKeys` | Array | `[]` | External/host-controlled multi-column sort key list, `[{ key, order }, …]`; mirrors `sortKey`/`sortOrder` for shift+click multi-sort. In self-fetch mode the active multi-sort is instead persisted to and restored from `$route.query._order`. |
| `defaultSort` | Array | `[]` | Default multi-key **client-side** sort applied to the already-loaded rows whenever no explicit column sort is active (no `sortKey`). Each entry is `\{ field, order? \}` with `order` one of `'asc'` / `'desc'` (default `'asc'`); rows compare by the first field, ties broken by the next, etc. (type-aware: numbers numerically, dates by timestamp, else `localeCompare`; empties sort last). Clicking a sortable header takes over and suppresses this default. Fed from `pages[].config.defaultSort`. Useful for a fixed presentation order such as group-by-type-then-name. |
| `rowKey` | String | `'id'` | Unique row identifier field |
| `rowIcon` | String \| Function | `null` | Optional leading icon for every table row — a static MDI icon name or `(row) => iconName`. Forwarded to `CnDataTable`. Fed from the manifest as `pages[].config.rowIcon`. |
| `activeOrganisation` | Object \| null | `null` | Optional multi-tenant binding from a tenant-switcher higher in the tree. When the bound organisation changes, CnIndexPage calls `store.setActiveTenantOrganisation(uuid)` so the next `fetchCollection()` stamps the new `X-OpenRegister-Organisation` header and the in-memory list caches are cleared. Leave `null` for single-tenant pages. See [Multi-tenancy guide](../multi-tenancy.md). |
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
| `allowExport` | Boolean | `false` | Opt-in flag for the native Export menu (CSV/Excel) rendered next to the Add button. Renders only when `true` AND the resolved schema is flagged `exportable: true`; navigates to `GET /apps/openregister/api/objects/{register}/{schema}/export`, passing `$route.query` through as filters. Distinct from `showMassExport`, which exports the fetched/selected rows via a blob download instead. |
| `allowSavedViews` | Boolean | `false` | Opt-in flag for the saved-views control (saved-views-ui): a Views dropdown listing the user's OpenRegister saved-search views (`GET /apps/openregister/api/views`). Applying a view writes its stored filters/search/sort into the route query (non-underscore keys are filters; `_search`/`_sortKey`/`_sortOrder` are reserved); "Save current view…" persists the current route-query state via `POST /apps/openregister/api/views`; own views can be deleted after confirmation. Emits `apply-view` when a view is applied. |
| `massActionNameField` | String | `'title'` | Field for display names in mass action dialogs |
| `nameFormatter` | Function | `null` | Optional function `(item) => string` to format item names in dialogs. Overrides `massActionNameField` when provided. Passed to all delete and copy dialogs. |
| `exportFormats` | Array | `[]` | Available export formats |
| `importOptions` | Array | `[]` | Import dialog options |
| `showFormDialog` | Boolean | `true` | Enable built-in create/edit form dialog |
| `showRequestFeature` | Boolean | `true` | Show the built-in "Request a feature" entry in the CnActionsBar overflow. Opens the CnSuggestFeatureModal with `surface: "index:<schema>"`. Requires a CnAppRoot ancestor (repo inject) to open — warns + no-ops otherwise |
| `useAdvancedFormDialog` | Boolean | `false` | Use [CnAdvancedFormDialog](./cn-advanced-form-dialog.md) for create/edit (properties table, JSON tab, optional metadata) instead of CnFormDialog |
| `createOverride` | Function | `null` | Opt-in async create hook. When set, a **create** confirmed from the built-in form dialog calls `await createOverride(formData, ctx)` instead of the store / self-store `saveObject`. The override owns persistence (e.g. an app posting through a contact-aware endpoint that fills a required FK before saving to OpenRegister) and must return the created object on success (falsy = failure; throwing surfaces the error in the dialog). `ctx` is `{ register, schema, objectType, effectiveSchema }`. Edits are never routed here; when absent, create behaviour is unchanged. See [Per-schema create-override hook](#per-schema-create-override-hook). |
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
| `subscribe` | Boolean | `true` | [Self-fetch mode](#self-fetch-mode) only — auto-subscribe to live collection updates for the page's register/schema scope and refetch (coalesced) on remote changes. Set `false` (manifest: `config.subscribe: false`) for static views. See [Live updates](#live-updates--collection-subscription). |
| `showViewToggle` | Boolean | `true` | Show table/card view toggle |
| `inlineSearch` | Boolean | `false` | Show an inline search field in the actions bar (manifest: `config.inlineSearch`) |
| `filterMenu` | Boolean | `false` | Show a filter menu (funnel) in the table header listing each enum/badge column's values as toggleable facet filters (manifest: `config.filterMenu`) |
| `columnMenu` | Boolean | `false` | Show a column menu (columns button) in the table header listing every governed column as a visibility checkbox — the in-table equivalent of the sidebar's Columns tab (manifest: `config.columnMenu`). See [Filter and columns: table header vs sidebar](#filter-and-columns-table-header-vs-sidebar). |
| `searchPlaceholder` | String | `''` | Placeholder for the inline search field (manifest: `config.searchPlaceholder`) |
| `cardsLabel` / `tableLabel` | String | `''` | View-toggle option labels, e.g. "Tiles" / "List" (manifest: `config.cardsLabel` / `config.tableLabel`) |
| `cardsIcon` / `tableIcon` | String | `''` | MDI icon names for the view-toggle options (manifest: `config.cardsIcon` / `config.tableIcon`) |
| `store` | Object | `null` | Store instance for automatic save integration. When provided with `objectType`, the form dialog saves directly to the store via `store.saveObject()` instead of only emitting `create`/`edit`. The object type must already be registered in the store via `registerObjectType()`. |
| `objectType` | String | `''` | Object type slug for store integration (e.g. `\${registerId}-\${schemaId}`). Required when `store` is set — a console warning is emitted if missing. |
| `sidebar` | Object | `null` | Manifest-driven sidebar configuration. When set with `enabled: true`, CnIndexPage auto-mounts an embedded `CnIndexSidebar` and forwards its props. Shape: `\{ enabled, show?, columnGroups?, facets?, showMetadata?, search? \}`. `show` (default `true`) is the visibility gate — set `false` to hide the configured sidebar without removing config. When unset (the default), the legacy slot-based pattern is preserved — consumers wire their own `CnIndexSidebar` at the App.vue level. See [Manifest-driven sidebar](#manifest-driven-sidebar) below. |
| `searchValue` | String | `''` | Current search term forwarded to the embedded sidebar (only relevant when `sidebar.enabled`). |
| `visibleColumns` | Array | `null` | Currently visible column keys forwarded to the embedded sidebar (only relevant when `sidebar.enabled`). |
| `activeFilters` | Object | `\{\}` | Currently active facet filters `\{ fieldName: [values] \}` forwarded to the embedded sidebar (only relevant when `sidebar.enabled`). |
| `register` | String | `''` | Effective register slug for the page. Forwarded as a prop to the resolved `cardComponent` so bespoke card UIs can match the schema → register pair. Manifest-driven path: `pages[].config.register` flows in via `CnPageRenderer`. |
| `cardComponent` | String | `''` | Optional name of a consumer-provided card component (registered in the `customComponents` registry on `CnAppRoot`) to render in place of the default `CnObjectCard` when the page is in card-grid view mode. Resolution priority: `#card` scoped slot → `cardComponent` registry entry → default `CnObjectCard`. Unknown names log a `console.warn` once and fall back to the default so a misconfigured manifest never blanks the grid. See [Bespoke card-grid](#bespoke-card-grid-via-cardcomponent) below. |
| `customComponents` | Object | `null` | Optional explicit `customComponents` registry. Overrides the registry injected from `CnAppRoot` via `cnCustomComponents`. Mostly used by unit tests; production consumers register components on `CnAppRoot` instead. |

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
| `row-click` | `row` | Row, card, **or map marker** clicked. **Only fires when `selectable` is `false`** — when `selectable` is `true`, a deliberate click anywhere on a row/card toggles its selection (emitting `select`) instead — a text-selection drag is not treated as a click. In the [map view mode](#map-view-mode) a marker click resolves back to its source row and emits the identical payload, so detail-page navigation is uniform across table, cards, and map. Conceptually distinct from `view`; for click-to-open in a selectable list, use the built-in View action (`@view`). |
| `view` | `row` | Built-in View row action triggered. Conceptually "open the detail view of this row". For a non-selectable list bind alongside `row-click` (same handler) for click-to-view; for a **selectable** list, plain clicks toggle selection, so use `@view` (the eye action) as the open-detail affordance. |
| `sort` | `\{ key, order \}` | Sort changed. Cycles through `asc → desc → null` (disabled). When cleared, both `key` and `order` are `null`. |
| `page-changed` | `pageNum` | Pagination page changed |
| `page-size-changed` | `size` | Page size changed |
| `select` | `ids[]` | Selection changed |
| `action` | `\{ action, row \}` | Custom row action triggered |
| `search` | `term` | Search input changed in the embedded sidebar (only emitted when `sidebar.enabled`). |
| `columns-change` | `keys[]` | Visible columns changed in the embedded sidebar (only emitted when `sidebar.enabled`). |
| `filter-change` | `\{ key, values \}` | Facet filter changed in the embedded sidebar (only emitted when `sidebar.enabled`). |
| `quick-filter-change` | `index` | Zero-based active tab index changed (only emitted when `quickFilters` is set). The fetch is automatically triggered — listen for observability / analytics. |
| `apply-view` | `view` | A saved view was applied via the Views dropdown (only emitted when `allowSavedViews`). The route query has already been replaced with the view's stored state — listen for observability / analytics. |

## Slots

| Slot | Scope | Description |
|------|-------|-------------|
| `#below-header` | — | Content rendered between the page header and the actions bar (e.g. status banners, alerts) |
| `#mass-actions` | `\{ count, selectedIds \}` | Extra mass action buttons |
| `#action-items` | — | Extra action bar buttons |
| `#header-actions` | — | Extra header buttons |
| `#delete-dialog` | `\{ item, close \}` | Replace single-item delete dialog |
| `#copy-dialog` | `\{ item, close \}` | Replace single-item copy dialog |
| `#form-dialog` | `\{ show, item, schema, confirm, close \}` | Replace create/edit dialog (any variant). Use `show` as a `v-if` guard so the dialog unmounts after `close`; otherwise an always-mounted override re-opens when its internal close animation finishes. Call `await confirm(object)` to save — see [Replacing the form dialog](#replacing-the-form-dialog). |
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
| `setFormResult(result)` | Set the terminal form dialog result (`\{ success?, error? \}`) — switches to the result phase, replacing the form |
| `setFormValidationErrors(fieldErrors, message?)` | Show a validation error while keeping the form visible (so the user can fix the data). Use for 400/422; store integration calls this automatically for `isValidation` errors |
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

### Replacing the form dialog

The `#form-dialog` slot swaps the whole dialog out — use it when the replacement needs
control the built-in dialog cannot give it (a wider `size`, a multi-pane layout, its own
footer). Reach for `#form-fields` first if you only need different fields inside the
standard dialog.

**Save through the scope's `confirm`, not your own store call.** `confirm(object)` runs the
page's normal save path — `createOverride` / the `store` prop / the self-fetch store,
whichever applies — then emits `@create` or `@edit` **and refreshes the list** (the
self-fetch and `createOverride` paths refresh automatically; with the `store` prop, list
refresh is driven by your own `@create`/`@edit` handler, same as it always has been). A
replacement dialog that persists on its own instead bypasses all of that: the row will not
appear until the user reloads, because the built-in refresh never runs. (Live
`or-collection-*` updates do cover this eventually, but only where server push is actually
delivered, so do not rely on them.) Saving through `confirm` also keeps writes in the same
store the list reads from, rather than a second cache of the same objects.

`confirm` is async — await it, then `close()`:

```vue
<CnIndexPage title="Mappings" register="openconnector" schema="mapping">
  <template #form-dialog="{ show, item, confirm, close }">
    <MyWideDialog
      v-if="show"
      :item="item"
      @save="async (draft) => { await confirm({ ...item, ...draft }); close() }"
      @cancel="close" />
  </template>
</CnIndexPage>
```

An object carrying no id creates; otherwise it updates, so spread the incoming `item` under
your edits to preserve fields the replacement dialog does not touch. Result-phase helpers
(`setFormResult`, `setFormValidationErrors`) target the built-in dialog's `ref` and become
no-ops once it is replaced — surface success and failure in your own dialog.

### Store integration

Set `store` and `objectType` to have the form dialog save directly to the store. The object type must be registered in the store (via `registerObjectType()`) before passing the store here. On save, `store.saveObject(objectType, formData)` is called; on success the result phase is shown and `@create` / `@edit` are emitted with the saved object. On a **validation error** (`isValidation`, i.e. 400/422) the form stays open with the server message shown above the fields so the user can correct the data; other failures show a terminal error result.

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

### Per-schema create-override hook

Some schemas can't be persisted by a plain `saveObject` straight to OpenRegister — they have a server-side prerequisite that must run first. The canonical example: a `client` whose required `contactsUid` is a foreign key to a Nextcloud addressbook contact. The generic create flow would POST without that FK and get a `400`. The app already has a contact-aware endpoint (`POST /api/contacts-sync/create`) that resolves/creates the contact and saves with the FK filled in — but the **generic** "Add" button on the list went straight through `saveObject`.

`createOverride` closes that gap. Pass an async function; on a **create** (not edit), the built-in form dialog calls it instead of `saveObject`. The override owns persistence and returns the created object:

```vue
<CnIndexPage
  title="Clients"
  :schema="clientSchema"
  :store="objectStore"
  object-type="crm-client"
  :create-override="createClientContactAware"
  @refresh="fetchClients"
/>
```

```js
methods: {
  // Route generic client creates through the contact-aware endpoint that
  // fills the required contactsUid (FK to a NC addressbook contact) before
  // saving to OpenRegister. Other schemas can branch on ctx.objectType.
  async createClientContactAware(formData, ctx) {
    const created = await contactSyncApi.create(formData) // POST /api/contacts-sync/create
    return created // truthy => @create emitted + dialog success; falsy => failure
  },
}
```

Rules:
- **Create-only.** Edits always fall through to the normal store / self-store path; the override is never called for an edit.
- **Return the created object** (truthy) on success; return a falsy value to signal failure (terminal error shown). **Throw** to surface `err.message` in the dialog.
- `ctx` is `{ register, schema, objectType, effectiveSchema }` so one handler can branch per schema.
- When the prop is absent, create behaviour is **unchanged** — no regression for existing consumers.

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

### Hiding built-in actions from a manifest

Manifest `type:'index'` pages can hide individual built-in actions without writing a wrapper component. The renderer (`CnPageRenderer.resolvedProps`) flattens `config.actionToggles.*` into the matching `show*` / `selectable` props before mounting `CnIndexPage`. Explicit `config.<key>` wins over `config.actionToggles.<key>` (precedence mirrors the existing `config.readOnly` shortcut).

```json
{
  "id": "Catalogs",
  "route": "/catalogi",
  "type": "index",
  "title": "Catalogs",
  "config": {
    "register": "opencatalogi",
    "schema": "catalog",
    "actionToggles": {
      "showEditAction": false,
      "showCopyAction": false,
      "showDeleteAction": false,
      "showMassImport": false,
      "showMassExport": false,
      "showMassCopy": false,
      "showMassDelete": false
    }
  }
}
```

Known keys (each maps to the matching `CnIndexPage` prop):
`showAdd`, `showFormDialog`, `showEditAction`, `showCopyAction`, `showDeleteAction`, `showMassImport`, `showMassExport`, `showMassCopy`, `showMassDelete`, `showViewToggle`, `selectable`. Unknown keys pass validation (forward-compat).

For a fully read-only page, prefer the all-or-nothing shortcut:

```json
"config": { "register": "...", "schema": "...", "readOnly": true }
```

This expands to nine `show*: false` defaults; explicit `config.showAdd: true` still re-enables a specific button.

## Self-fetch mode

A manifest `type:"index"` page dispatches to `CnIndexPage` via `CnPageRenderer`, which spreads `pages[].config` (`register`, `schema`, `columns`, `sidebar`, `actions`, `filter`) plus `$route.params` — but **never an `objects` prop**. So when `register` **and** `schema` are both set **and** the caller did not pass `objects`, `CnIndexPage` self-fetches: it derives `objectType = '${register}-${schema}'`, registers it in the object store, and drives the whole list (collection fetch, `_search`/`_order`/`_page`/`_limit`, facet filters, schema load, sidebar wiring, the `on*` handlers) through [`useListView`](../utilities/composables/use-list-view.md) against the store provided by an ancestor `CnAppRoot`.

```json
{
  "type": "index",
  "title": "Decisions",
  "config": {
    "register": "decidesk",
    "schema": "decision",
    "sidebar": { "enabled": true }
  }
}
```

In this mode the page's rows, loading, pagination, schema, sort and search term all come from the `useListView` instance rather than from props; `@search` / `@sort` / `@page-changed` / `@filter-change` / `@refresh` route to its handlers (and still `$emit` for observers).

Form save (create/edit), **mass export**, and **mass import** are also self-handled in this mode, because the manifest path has no parent listening for `@create` / `@edit` / `@mass-export` / `@mass-import`. Confirming the export dialog downloads the register/schema's objects in the chosen format from OpenRegister's `/api/objects/{register}/{schema}/export?type=` endpoint; confirming the import dialog uploads the file to `/api/registers/{register}/import` (multipart; the schema slug is added for CSV) and refreshes the list. Both resolve their dialog with no consumer handler required. In consumer-managed mode (`objects` supplied) `@mass-export` / `@mass-import` still just emit for the parent to handle.

### Scoping a list to a parent — `config.filter`

`config.filter` becomes the [`filter` prop](#props) and is applied to **every** fetch as a *fixed* filter (a user's facet selection for the same key cannot override it). String values of the form `"@route.<name>"` or `":<name>"` resolve against `$route.params`; everything else is passed through literally. The filter re-resolves when `$route.params` change, so a list nested under a parent route (`/forms/:id/submissions`, `/automations/:id/history`) is a fully declarative `type:"index"` page:

```json
{
  "type": "index",
  "title": "Submissions",
  "route": "/forms/:id/submissions",
  "config": {
    "register": "pipelinq",
    "schema": "intakeSubmission",
    "filter": { "intakeForm": "@route.id", "archived": false }
  }
}
```

### Live updates — collection subscription

In self-fetch mode the page also **subscribes to live collection updates** for its `or-collection-{register}-{schema}` scope (via [`useObjectSubscription`](../utilities/composables/use-object-subscription.md) and the store's [`liveUpdatesPlugin`](../../store/plugins/live-updates.md)). When another user creates, updates, or deletes an object in the register/schema pair, the list refetches with its **current** params (page, sort, search, filters) — events are hints, so bursts (mass import, bulk edits) are coalesced into at most one refetch per ~750 ms window, deduped against in-flight requests. When notify_push is unavailable the transport falls back to visibility-gated polling; nothing else changes for the page.

The subscription attaches on mount and is released on unmount; the epoch guard inside `useObjectSubscription` prevents a navigation-away during the async subscribe from leaking a stale subscription.

Opt out per page with the `subscribe` prop (default `true`):

```json
{
  "type": "index",
  "title": "Archive",
  "config": { "register": "decidesk", "schema": "decision", "subscribe": false }
}
```

### Consumer-managed mode is unchanged

When the `objects` prop **is** supplied (every current consumer), nothing changes — no `useObjectStore` / `useListView` call, no `registerObjectType` / `fetchCollection`, no live-updates subscription; `objects` and the other props are used as today and `filter` has no effect. The switch is purely "did the caller pass `objects`?".

## Map view mode

Alongside `table` and `cards`, CnIndexPage offers an **opt-in `map` view mode** — a third view-toggle segment that plots the **current filtered rows** on a [CnMapWidget](./cn-map-widget.md). It is strictly opt-in and fully backward compatible: pages that don't configure it render exactly as before.

**Key properties of the map view:**

- **Same data, same filters.** The map plots exactly the rows the table/cards show (`displayObjects`) — there is no separate fetch path, so the sidebar facets, quick-filters, and search all narrow the markers too.
- **Geometry from object metadata.** Marker coordinates are read from each object via `mapConfig`, typically off the OpenRegister `@self` metadata block that the maps-overview leaf populates — not a bespoke per-app endpoint.
- **Navigation parity.** A marker click resolves back to its source row and emits the same `@row-click` payload as a table row-click, so detail-page navigation is identical across all three modes.
- **Graceful geometry gaps.** Rows without finite, resolvable coordinates are skipped silently; an empty set falls back to `mapConfig.center` (or a neutral world view).

**Opting in (manifest):**

```json
{
  "id": "Cases",
  "type": "index",
  "route": "/cases",
  "config": {
    "register": "procest",
    "schema": "case",
    "viewModes": ["table", "cards", "map"],
    "map": {
      "geoField": "@self.geo",
      "latField": "@self.geo.lat",
      "lngField": "@self.geo.lng",
      "popupField": "title"
    }
  }
}
```

`config.map` maps 1:1 onto the `mapConfig` prop. `config.viewModes` is optional — when omitted, the map segment appears automatically whenever `config.map` is non-empty. Set an explicit `viewModes` list to force or suppress it. `geoField` (a GeoJSON `Point`) takes precedence over `latField`/`lngField` when present and resolvable; all three accept dotted paths.

**Direct (non-manifest) use:**

```vue
<CnIndexPage
  :objects="cases"
  :schema="caseSchema"
  view-mode="map"
  :map-config="{ latField: 'lat', lngField: 'lng', popupField: 'title' }"
  :selectable="false"
  @row-click="openCase" />
```

## Context Menu

Right-clicking any table row opens a context menu at the cursor position with the same actions as the three-dot row action menu. The context menu renders the `mergedActions` computed (app-provided actions + built-in Edit/Copy/Delete), so it stays in sync automatically — no app-side changes needed.

Powered by the [`CnContextMenu`](./cn-context-menu.md) component and [`useContextMenu`](../utilities/composables/use-context-menu.md) composable. The composable handles cursor positioning via CSS custom properties; the component renders the NcActions menu.

- Each action's `disabled` state (boolean or function) is respected
- Destructive actions are styled with `--color-error`
- The menu closes on action click or outside click, cleaning up the CSS properties and data attribute
- Works out of the box for all consumer apps (OpenRegister, Keepiq, etc.)

## Filter and columns: table header vs sidebar

Faceted **filtering** and **column visibility** can live in **two** places, and you choose per page from the manifest:

| Surface | Filter | Columns | Config |
|---------|--------|---------|--------|
| **Table header** (recommended default) | `filterMenu: true` → funnel button | `columnMenu: true` → columns button | `config.filterMenu` / `config.columnMenu` |
| **Sidebar** | `sidebar.facets` | `sidebar.columnGroups` (Columns tab) | `config.sidebar.enabled: true` |

**The recommended default for an index page is the table header** — it keeps both controls one click away inside the table and frees the sidebar for the detail/object surface. Use the sidebar variant when you want a persistently-open faceting panel.

```jsonc
// Recommended index-page default — both controls in the table header,
// search inline, sidebar off so the space is reclaimed.
{
  "type": "index",
  "config": {
    "register": "petstore", "schema": "order",
    "inlineSearch": true,
    "filterMenu": true,
    "columnMenu": true,
    "sidebar": { "enabled": false }
  }
}
```

Both surfaces drive the same state — `filterMenu`/`columnMenu` toggle the same `activeFilters` / `visibleColumns` the sidebar would, and emit the same `@filter-change` / `@columns-change` events — so a page can even expose both at once if desired.

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

- `"navigate"` — calls `$router.push({ name: action.route, params: { id: row[rowKey], ...action.params } })`. The `route` field is required when this keyword is set. An optional `params` object holds **literal** route params merged over the default `{ id: row[rowKey] }` — so `params: { "id": "new" }` makes a "New X" action land on the detail route in create mode, and `params: { "mode": "edit" }` keeps the row id while adding an extra param. The same `params` works on `config.headerActions[]` (page-level — no row, so the literals are the whole param map).
- `"emit"` — explicit no-op handler that just bubbles `@action`. Identical to leaving `handler` unset, but makes intent visible in the manifest.
- `"none"` — disables the action click entirely (no handler call, no `@action` emit).

Example:

```jsonc
{
  "actions": [
    { "id": "view", "label": "Open", "handler": "navigate", "route": "QueueDetail" },
    { "id": "z",    "label": "Z",    "handler": "emit" },
    { "id": "x",    "label": "X",    "handler": "none" }
  ],
  "headerActions": [
    { "id": "new", "label": "New resource", "handler": "navigate", "route": "ResourceDetail", "params": { "id": "new" } }
  ]
}
```

### Fallback semantics

- Missing handler name in the registry → silent fall-through to `@action`-only (no warning; preserves v1.2 manifests).
- Non-function entry in the registry (e.g. a Vue component) → console.warn + fall-through to `@action`-only.
- Function-typed `handler` (passed via the runtime prop, NOT through the manifest) keeps working unchanged — used by the built-in `view` / `edit` / `copy` / `delete` actions.

## Bespoke card-grid via `cardComponent`

The default card-grid view renders `CnObjectCard` for each row using
the page's schema. When that's not enough — e.g. softwarecatalog's
`Organisaties` page needs a profile-style card with a logo,
contactpersoon block, and a CTA button — point the manifest at a
consumer-provided card component:

```js
// src/customComponents.js
import OrganisatieCard from './components/cards/OrganisatieCard.vue'
export const customComponents = \{ OrganisatieCard \}
```

```vue
<!-- App.vue -->
<CnAppRoot
  :manifest="manifest"
  app-id="softwarecatalog"
  :custom-components="customComponents">
  <router-view />
</CnAppRoot>
```

```jsonc
// src/manifest.json — pages[]
\{
  "id": "organisaties",
  "route": "/organisaties",
  "type": "index",
  "title": "Organisaties",
  "config": \{
    "register": "softwarecatalog",
    "schema": "organisation",
    "cardComponent": "OrganisatieCard"
  \}
\}
```

The resolved card component receives `\{ item, object, schema, register, selected \}`
props and emits `click` and `select`. When the page is **not** selectable a
`click` is forwarded as `row-click`; when it **is** selectable a `click` toggles
the item's selection instead (matching the default card/row behaviour). `select`
is always forwarded as `select` on the page. `item` and `object` are aliases of
each other; pick whichever feels natural.

Resolution priority (highest first):

1. `#card` scoped slot — App.vue overrides always win.
2. `cardComponent` registry entry — manifest-driven dispatch.
3. `CnObjectCard` — the schema-driven library default.

Unknown `cardComponent` names log `console.warn` once and fall back
to the default so a misconfigured manifest never blanks the grid.

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

## Documentation link

Set `documentationUrl` (and optionally `documentationLabel`) to surface a **Documentation** entry in the [`CnActionsBar`](./cn-actions-bar) overflow menu, alongside the built-in Request-a-feature item. It opens the link in a new tab. Empty (the default) hides it.

## Reference (auto-generated)

The tables below are generated from the SFC source via `vue-docgen-cli`. They reflect what's actually in [`CnIndexPage.vue`](https://github.com/ConductionNL/nextcloud-vue/blob/beta/src/components/CnIndexPage/CnIndexPage.vue) — props, events, and named slots — and update automatically whenever the component changes (see [CLAUDE.md "Documenting components"](https://github.com/ConductionNL/nextcloud-vue/blob/beta/CLAUDE.md#documenting-components-enforced)).

<GeneratedRef />

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

