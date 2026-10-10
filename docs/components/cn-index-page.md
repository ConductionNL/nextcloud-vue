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
| `cardAccent` | Function | `null` | `(object) => { variant, icon?, label? } \| null`: a status accent per card in the card view, a colored start border and icon (see CnObjectCard `accent`). |
| `schema` | Object \| String | `null` | OpenRegister schema for auto-generating columns, filters, and form fields. In [self-fetch mode](#self-fetch-mode) a String is the schema **slug** — the resolved schema object then drives column generation. |
| `objects` | Array | `[]` | Row data. **Omitting this prop** while `register` + `schema` are set switches the page into [self-fetch mode](#self-fetch-mode) — it drives the list off the object store itself. |
| `entitySource` | String | `''` | Name a registered NON-OBJECT collection to list (e.g. `flows`), instead of `register` + `schema`. The third data mode: a flow definition is deliberately not an OpenRegister object, so an index had nothing to bind to and such lists became bespoke `type: "custom"` pages. Takes precedence over `register`/`schema` and suppresses self-fetch; non-empty `objects` still wins over both. Sources are registered in `indexSources.js`; `tasks` lists the viewer's task inbox from OpenRegister's flow-tasks read, with its own columns, scope tabs, deep-link rows and no Add button. |
| `rowRoute` | String | `''` | Route name a clicked row opens on THIS app's router, overriding a named `entitySource`'s own navigation. A source knows where its rows live and navigates itself, which is right when the detail page belongs to another app: `tasks` sends a click to OpenRegister's task page. It is wrong for an app that ships its own page for those rows, and the `@row-click` event cannot recover it, because `openRow` calls `window.location.assign()` and the host's push never lands. Set it and the row pushes `{ name: rowRoute, params: { id } }` instead. Ignored when `entitySource` is not set. |
| `sourceConfig` | Object | `null` | Config handed to the named `entitySource`'s loader — e.g. `{ app: 'dossiq' }` scopes the `flows` source to one app's flows; `{ scope: 'pooled' }` scopes the `tasks` source. On a manifest page `CnPageRenderer` fills it with the resolved page config when none is set explicitly. Ignored when `entitySource` is not set. |
| `filter` | Object | `null` | [Self-fetch mode](#self-fetch-mode) only — a base filter map applied to every fetch as a *fixed* filter (the user's facet filters can't override it). String values of the form `"@route.<name>"` or `":<name>"` resolve to `$route.params[<name>]`; other values pass through. Re-resolves when `$route.params` change. Fed from `pages[].config.filter` in the manifest path. No effect in consumer-managed mode. |
| `quickFilters` | Array | `null` | [Self-fetch mode](#self-fetch-mode) only — array of `\{ label, filter, default?, icon? \}` rendered as a tab strip above the table (see [CnQuickFilterBar](./cn-quick-filter-bar.md)). The active tab's `filter` is merged into every fetch *after* `filter` (the tab wins on a colliding key) and *before* the user's `activeFilters` (which still narrow within the active tab). String values follow the same `"@route.<name>"` resolution as `filter`. First entry with `default:true` (else index 0) is active on mount; switching tabs re-fetches at page 1 and emits `@quick-filter-change`. Fed from `pages[].config.quickFilters`. |
| `quickFilterMode` | String | `'chips'` | How the quick filters render: `'chips'` (pill strip) or `'dropdown'` (a single `NcSelect`; the empty-filter "All" tab is dropped). Fed from `pages[].config.quickFilterMode`. |
| `quickFilterMultiple` | Boolean | `false` | Allow several quick filters active at once. Selected tabs' filters are OR-ed together into the fetch (same field → array value → `field[]=` IN query). Fed from `pages[].config.quickFilterMultiple`. |
| `quickFilterMaxVisible` | Number | `0` | Chips mode only: how many quick-filter pills render inline before the rest move behind one more chip — a `⋯` pill that opens a panel of the hidden lenses. `0` renders every tab, which wraps the actions bar onto a second line once a page declares more than a handful. The visible set is the first *n* entries of `quickFilters`. Fed from `pages[].config.quickFilterMaxVisible`. |
| `pagination` | Object | `null` | Pagination state (`\{ currentPage, totalPages, totalItems, pageSize \}`) |
| `loading` | Boolean | `false` | Loading state |
| `loadingText` | String | `'Loading…'` | Accessible label for the loading spinner (NcLoadingIcon aria-label) |
| `selectable` | Boolean | `true` | Enable row selection checkboxes |
| `rowClickToView` | Boolean | `false` | When true, a row/card click emits `row-click` (to open/navigate) even while `selectable` — selection then via the checkbox only. Only takes effect when something can open the row (a `row-click` listener, or a named source that routes its rows); otherwise the click selects, so it is never dead. With `selectable: false` a click always emits `row-click`. Manifest-driven pages set this automatically when a matching detail page, `rowRoute` or split view exists, and ignore an explicit `true` when none does. |
| `selectedIds` | Array | `[]` | Currently selected IDs |
| `viewMode` | String | `'table'` | `'table'`, `'cards'`, or `'map'`. The `'map'` mode is only offered when the page opts in — see [Map view mode](#map-view-mode). |
| `mapConfig` | Object | `\{\}` | Marker geometry mapping for the opt-in [map view mode](#map-view-mode), mirroring manifest `config.map` 1:1: `\{ latField, lngField, geoField?, popupField?, center? \}`. When non-empty (and not excluded by `viewModes`), a third "Map" toggle segment appears. `latField`/`lngField` are object (or `@self`) property paths (dotted paths supported); `geoField` is an alternative GeoJSON Point property that wins over lat/lng; `center` is a `[lat, lng]` fallback for an empty set. |
| `mapLabel` | String | `''` | Label for the map view-toggle segment (defaults to "Map"). Fed from `pages[].config.mapLabel`. |
| `mapIcon` | String | `''` | MDI icon name for the map view-toggle segment (defaults to the built-in map-marker icon). |
| `calendar` | Object | `\{\}` | The opt-in [calendar view mode](#calendar-view-mode), mirroring manifest `config.calendar`: `\{ dateField, endDateField?, titleField? \}`. The segment appears only when `viewModes` lists `calendar` and `dateField` is named. |
| `viewModes` | Array | `null` | Explicit whitelist of toggle segments to offer, e.g. `['table', 'cards', 'map', 'calendar']`. Fed from `pages[].config.viewModes`. When set it takes precedence over inferred availability (map otherwise appears iff `mapConfig` is non-empty). |
| `sortKey` | String | `null` | Current sort column key. `null` means no column is actively sorted. |
| `sortOrder` | String | `'asc'` | `'asc'`, `'desc'`, or `null` (no sort) |
| `sortKeys` | Array | `[]` | External/host-controlled multi-column sort key list, `[{ key, order }, …]`; mirrors `sortKey`/`sortOrder` for shift+click multi-sort. In self-fetch mode the active multi-sort is instead persisted to and restored from `$route.query._order`. |
| `defaultSort` | Array | `[]` | Default multi-key **client-side** sort applied to the already-loaded rows whenever no explicit column sort is active (no `sortKey`). Each entry is `\{ field, order? \}` with `order` one of `'asc'` / `'desc'` (default `'asc'`); rows compare by the first field, ties broken by the next, etc. (type-aware: numbers numerically, dates by timestamp, else `localeCompare`; empties sort last). Clicking a sortable header takes over and suppresses this default. Fed from `pages[].config.defaultSort`. Useful for a fixed presentation order such as group-by-type-then-name. |
| `rowKey` | String | `'id'` | Unique row identifier field |
| `rowIcon` | String \| Function | `null` | Optional leading icon for every table row — a static MDI icon name or `(row) => iconName`. Forwarded to `CnDataTable`. Fed from the manifest as `pages[].config.rowIcon`. |
| `activeOrganisation` | Object \| null | `null` | Optional multi-tenant binding from a tenant-switcher higher in the tree. When the bound organisation changes, CnIndexPage calls `store.setActiveTenantOrganisation(uuid)` so the next `fetchCollection()` stamps the new `X-OpenRegister-Organisation` header and the in-memory list caches are cleared. Leave `null` for single-tenant pages. See [Multi-tenancy guide](../multi-tenancy.md). |
| `collectionUrl` | String | `''` | Self-fetch only. List from this endpoint instead of `/api/objects/{register}/{schema}`, for a list that mixes several register/schema pairs. See [Mixed-schema collections](#mixed-schema-collections-collectionurl). |
| `columns` | Array | `[]` | Manual column definitions (overrides schema) |
| `excludeColumns` | Array | `[]` | Schema columns to hide |
| `includeColumns` | Array | `null` | Schema columns to show (whitelist) |
| `columnOverrides` | Object | `\{\}` | Per-column overrides |
| `actions` | Array | `[]` | Custom row action definitions. Each entry accepts the runtime `{label, icon, handler, …}` shape (function-typed `handler` fires directly) AND the manifest shape with a string `handler` resolved through the v2 `registry` first, then `customComponents` — see "Action handlers" below. An entry may also be a `"builtin:view"` / `"builtin:edit"` / `"builtin:copy"` / `"builtin:delete"` placeholder that puts that built-in at its position — see [Placing built-in row actions](#placing-built-in-row-actions). |
| `customComponents` | Object | `null` | Custom-component / handler registry. When set takes precedence over the injected `cnCustomComponents` from a CnAppRoot ancestor. Used to resolve `actions[].handler` registry names (manifest-actions-dispatch). Named handlers resolve out of the v2 `registry` (a `kind: "handler"` entry) FIRST and fall back to this map. |
| `emptyText` | String | `'No items found'` | Empty state message |
| `lenses` | Object \| null | `null` | Personal-lens report (`@self.lenses`) of the list on screen, for a host that fetches itself; self-fetch mode reads it from the store. A lens with `available: false` makes the empty state say why ("This server does not keep track of what you open.", "Log in to see what you opened recently.", "Your recent items are not available right now."). Needs openregister#4514. |
| `lensReasonTexts` | Object \| null | `null` | App wording for an unavailable lens, keyed `<lens>.<reason>` or `<reason>`. |
| `rowClass` | Function | `null` | CSS class provider for rows |
| `addLabel` | String | `''` | Add button label |
| `inlineActionCount` | Number | `2` | Number of inline action buttons before overflow menu |
| `showMassImport` | Boolean | `true` | Show mass import action |
| `showMassExport` | Boolean | `true` | Show mass export action |
| `showMassCopy` | Boolean | `true` | Show mass copy action |
| `showMassDelete` | Boolean | `true` | Show mass delete action |
| `allowExport` | Boolean | `false` | Opt-in flag for the native Export menu (CSV/Excel) rendered next to the Add button. Renders only when `true` AND the resolved schema is flagged `exportable: true` (top-level or `configuration.exportable`); navigates to `GET /apps/openregister/api/objects/{register}/{schema}/export`, passing the list's own query (without paging) as filters. Distinct from `showMassExport`, which exports the fetched/selected rows via a blob download instead. |
| `allowSavedViews` | Boolean | `false` | Opt-in flag for the saved-views control (saved-views-ui): a Views dropdown listing the user's OpenRegister saved-search views (`GET /apps/openregister/api/views`). Applying a view writes its stored filters/search/sort into the route query (non-underscore keys are filters; `_search` and `_order` are reserved); "Save current view…" persists the current route-query state via `POST /apps/openregister/api/views` and toasts either way, naming the view (a failure also keeps the dialog open with the reason); own views can be deleted after confirmation. Emits `apply-view` when a view is applied. |
| `viewCounts` | Boolean \| Array | `false` | Which saved views show how many records they match: `true` for all of them (the tabs named in `viewTabs` and the entries in the views control), or a list of view ids. Off by default, so no count request is made. A quick filter opts in on its own entry with `showCount: true`. Entries that filter the same single field share one grouped request. |
| `savedViewsScope` | String | `''` | Which pages share this page's saved views. By default a view is shared by every page over the same `register` and `schema` and shown on no other page, since a view is filters over one schema's fields. Set a name to share views across pages over different sources, or to keep two pages over one source apart. Written into the saved view's `query.scope` on save; views saved before scoping existed carry no scope and stay visible everywhere. |
| `massActionNameField` | String | `'title'` | Field for display names in mass action dialogs |
| `nameFormatter` | Function | `null` | Optional function `(item) => string` to format item names in dialogs. Overrides `massActionNameField` when provided. Passed to all delete and copy dialogs. |
| `exportFormats` | Array | `[]` | Available export formats |
| `importOptions` | Array | `[]` | Import dialog options |
| `showFormDialog` | Boolean | `true` | Enable built-in create/edit form dialog |
| `createModal` | String | `''` | Registry key of a `kind: 'modal'` entry that the Add button and `?action=create` open instead of the built-in form dialog, so an index page can share a dedicated create dialog with, say, a dashboard `open-modal` header action. Edits keep the form dialog. Needs a CnAppRoot ancestor to mount the modal; without one Add falls back to the form dialog. In a manifest: `"config": { "createModal": "ClientCreateDialog" }`. |
| `showRequestFeature` | Boolean | `true` | Show the built-in "Request a feature" entry in the CnActionsBar overflow. Opens the CnSuggestFeatureModal with `surface: "index:<schema>"`. Requires a CnAppRoot ancestor (repo inject) to open — warns + no-ops otherwise |
| `useAdvancedFormDialog` | Boolean | `false` | Use [CnAdvancedFormDialog](./cn-advanced-form-dialog.md) for create/edit (properties table, JSON tab, optional metadata) instead of CnFormDialog |
| `createOverride` | Function | `null` | Opt-in async create hook. When set, a **create** confirmed from the built-in form dialog calls `await createOverride(formData, ctx)` instead of the store / self-store `saveObject`. The override owns persistence (e.g. an app posting through a contact-aware endpoint that fills a required FK before saving to OpenRegister) and must return the created object on success (falsy = failure; throwing surfaces the error in the dialog). `ctx` is `{ register, schema, objectType, effectiveSchema }`. Edits are never routed here; when absent, create behaviour is unchanged. See [Per-schema create-override hook](#per-schema-create-override-hook). |
| `showViewAction` | Boolean | `true` | Show the built-in View row action. It is left out of a row's menu whenever a click on that row already opens its detail page (the menu offers Edit instead); a row with no detail page keeps it. Emits a dedicated `@view` event — independent of `@row-click`. Set to `false` when the row has no separate "open detail" target. On a named `entitySource` page the effective default is `false` — the source's own open action navigates to the detail page, which is the view; an explicit prop still wins. |
| `viewTo` | Function | `null` | `(row) => location \| null`: where the View row action links to. When it returns a location, View renders as a real link (middle-click, copy link) and does not emit `@view`; when it returns null, View stays a button that emits `@view`. Manifest pages get it from CnPageRenderer, pointing where a row click opens. |
| `showEditAction` | Boolean | `true` | Show the built-in Edit row action. On a named `entitySource` page the effective default is `false` — a source has no schema, so the form modal could only render empty; the source declares its own Edit, which navigates. An explicit prop still wins. |
| `editOpensDetail` | Boolean | `false` | Send the Edit row action to the record's detail page (emits `@edit-open`) instead of opening the edit modal. Opt-in only — `CnPageRenderer` does **not** derive it, because `@edit-open` is bound to the same navigation as a row click, so an Edit that routes only repeats the row click (the split pane, or the detail page) and the form stops being reachable from the list. Declare it per page when the modal cannot express the record. |
| `showCopyAction` | Boolean | `true` | Show copy row action. On a named `entitySource` page the effective default is whether the source implements `copyRow` (the built-in copy dialog then confirms through it); an explicit prop still wins. |
| `showDeleteAction` | Boolean | `true` | Show delete row action. On a named `entitySource` page the effective default is whether the source implements `deleteRow` (the built-in delete dialog then confirms through it); an explicit prop still wins. |
| `excludeFields` | Array | `[]` | Form fields to hide |
| `includeFields` | Array | `null` | Form fields to show (whitelist) |
| `fieldOverrides` | Object | `\{\}` | Per-field overrides |
| `formSize` | String | `'normal'` | NcDialog size for the built-in Add/Edit form dialog (`'small'`/`'normal'`/`'large'`) |
| `formColumns` | Number | `1` | How many columns the built-in Add/Edit form flows its fields into (`1` or `2`) |
| `createDefaults` | Object | `null` | Seed values for the built-in create dialog only (never edit). Resolves `@me`/`@now`/`@today` at any depth; `@object.*`/`@workspace.*`/`@config.*` are not resolved here and pass through unchanged. |
| `createSuccessRoute` | String \| Object | `null` | Route opened after a successful create from the built-in Add dialog; the created object's id is merged into the params. |
| `createSuccessMessage` | String | `''` | Toast shown after a successful create from the built-in Add dialog. |
| `showAdd` | Boolean | `true` | Show the Add button in the actions bar |
| `addDisabled` | Boolean | `false` | Disable the Add button (e.g. when required selections are missing) |
| `refreshDisabled` | Boolean | `false` | Disable the refresh button (e.g. when required selections are missing) |
| `subscribe` | Boolean | `true` | [Self-fetch mode](#self-fetch-mode) only — auto-subscribe to live collection updates for the page's register/schema scope and refetch (coalesced) on remote changes. Set `false` (manifest: `config.subscribe: false`) for static views. See [Live updates](#live-updates--collection-subscription). |
| `showViewToggle` | Boolean | `true` | Show table/card view toggle |
| `inlineSearch` | Boolean | `false` | Show an inline search field in the actions bar (manifest: `config.inlineSearch`). The field takes the place of the "Showing X of Y" counter unless `showCountWithSearch` is set |
| `showCountWithSearch` | Boolean | `false` | Keep the "Showing X of Y" counter visible beside the inline search field, after the search and any `#after-search` controls; forwarded to `CnActionsBar` (manifest: `config.showCountWithSearch`). Only relevant with `inlineSearch` |
| `filterMenu` | Boolean | `false` | Show a filter menu (funnel) in the table header listing each enum/badge column's values as toggleable facet filters (manifest: `config.filterMenu`) |
| `columnMenu` | Boolean | `false` | Show a column menu (columns button) in the table header listing every governed column as a visibility checkbox — the in-table equivalent of the sidebar's Columns tab (manifest: `config.columnMenu`). See [Filter and columns: table header vs sidebar](#filter-and-columns-table-header-vs-sidebar). |
| `searchInFiles` | Boolean | `false` | Show an "Also search inside files" switch beside the search box (manifest: `config.searchInFiles`). On, a search that has a term also sends `_content_search=true` (OpenRegister file-content search, capped at 50 candidates, noted under the list), and a row found through a file shows "Found in \{file\}" from `@self.matchedFile`. The switch is kept in the route as `contentSearch=1`. |
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
| `cardComponent` | String | `''` | Optional name of a consumer-provided card component (registered in the v2 `registry` — any kind carrying a `component` — or in the legacy `customComponents` map on `CnAppRoot`) to render in place of the default `CnObjectCard` when the page is in card-grid view mode. Resolution priority: `#card` scoped slot → `cardComponent` registry entry → default `CnObjectCard`. Unknown names log a `console.warn` once and fall back to the default so a misconfigured manifest never blanks the grid. See [Bespoke card-grid](#bespoke-card-grid-via-cardcomponent) below. |
| `customComponents` | Object | `null` | Optional explicit `customComponents` registry. Overrides the registry injected from `CnAppRoot` via `cnCustomComponents`. Mostly used by unit tests; production consumers register components on `CnAppRoot` instead. |

## Export follows the list

The Export menu (`allowExport`) and the mass-action Export export the rows the list is showing, not the whole schema.

- **The menu** sends the query the list itself sends: search, sort, facet filters, the page's fixed `filter` and the active quick filter, without paging (`_limit` and `_page` are dropped). A host-managed list (`objects` passed in) has no such query and keeps forwarding the route's.
- **The flag** that enables the menu is read from the schema's top-level `exportable`, then from `configuration.exportable`. The top-level field wins when both are set; a schema flagged in neither place keeps the menu hidden. (OpenRegister has to keep one of the two; until it does, the menu does not appear on a real instance.)
- **The mass export** exports the selected rows (as `ids[]`) when rows are selected, and the rows matching the list's query otherwise. The dialog says which, with the count, before the user confirms ([`CnMassExportDialog`](./cn-mass-export-dialog.md) `scopeText`).

## Calendar view mode

`viewMode` also accepts `calendar`: the current filtered rows on a month calendar by a date field ([`CnObjectCalendar`](./cn-object-calendar.md)). Opt in through `config.viewModes` and name the fields:

```json
{
  "viewModes": ["table", "calendar"],
  "calendar": { "dateField": "inspectionDate", "endDateField": "inspectionEnd", "titleField": "address" }
}
```

With `endDateField` an entry spans every day from the start to the end. In calendar mode the page adds the visible month to the list query (`dateField[gte]` and `[lte]`, or with an end field the overlap `dateField[lte]` and `endDateField[gte]`), asks again when the month changes, and fetches one page sized to the month; leaving calendar mode removes the range and restores the page size, so the table is never narrowed. A click on an entry opens the record as a row click does. A busy day's "+N" button switches to the table filtered to that day. Nothing here reschedules a record: dragging an entry to another day is not offered. Applying a saved view only changes the list filters, so the same month query is used; the `/api/views/{id}/calendar` endpoint is not called.

## Board and date axis: two more ways to look at the same list

`viewMode` accepts `board` and `dateAxis` beside `table`, `cards`, `list` and
`map`. Each needs its own config block, and each segment appears only when the
mode can actually work: a board needs a `statusField`, a date axis needs both
dates. A segment that opens a view saying it cannot be one is worse than no
segment, because the reader has to click it to find out.

```json
{
  "viewModes": ["table", "board", "dateAxis"],
  "board": {
    "statusField": "status",
    "cardFields": ["title", "assignee"],
    "swimlaneField": "assignee"
  },
  "dateAxis": {
    "startField": "startDate",
    "endField": "deadline",
    "laneField": "assignee",
    "labelField": "title"
  }
}
```

**The board never writes the status field.** A move goes through
`runTransition`, the host's own transition, so a board can never move a case
past a rule the case page enforces. With no `runTransition` the board is
read-only rather than broken. A move emits `board-move` and refreshes the list,
because a transition may have changed more than the status and a board that
only moved the card would disagree with the table beside it.

**A filter set on one mode does not follow you to another.** The two views are
asked different questions: a board is "show me the work in flight", a table is
"find me this case". Carrying the board's filter into the table is how somebody
searches for a case they know exists and is told there are no results; carrying
a table filter into a board silently empties three columns, and an empty column
reads as "no work here" rather than "you are not being shown it". The saved
view's own criteria *do* follow: the view is the question, the mode is how you
look at the answer.

**What the manifest cannot check.** A `statusField` naming a field with no enum
and no lifecycle cannot be refused at validation time, because the stages live
in the register schema and the manifest does not contain it. `CnBoardView` says
so on screen instead of drawing empty columns.

## Saved views: the tree, the labels and what a view is called

`savedViewTree` on an index page turns the flat Views dropdown into a tree.
Two hundred personal views in one flat list is the problem it solves. Absent,
the page renders exactly the dropdown it renders today.

```json
{
  "savedViewTree": {
    "enabled": true,
    "maxDepth": 3,
    "groupBy": "status",
    "landingView": { "behandelaar": "open-cases" },
    "columnsPerRole": { "behandelaar": ["id", "title", "status"] },
    "templates": [
      { "slug": "triage", "name": "Triage", "columns": ["id", "title"], "exportFields": ["id"] }
    ],
    "seeded": [
      { "slug": "open-cases", "name": "Open cases", "label": "triage", "actions": ["claim"] },
      { "slug": "open-mine", "name": "Mine", "parent": "open-cases", "inherits": ["columns", "sorting"] }
    ]
  }
}
```

**Inheritance is five parts, resolved separately** — criteria, columns,
sorting, defaultSort and exportFields. A child may narrow the criteria and keep
the parent's six columns, which an all-or-nothing rule makes impossible to
express. An absent `inherits` on a child means every part; an empty array means
none, so a view can hang under another for grouping alone. Overriding a part
and declaring nothing for it resolves to nothing, not to the parent's.

A cycle is refused naming both views. A parent the reader may not see is not an
error: the child renders at the root, resolved, and says which parts came from
a view they cannot see.

**A slug is the one name a view is called by** from a dashboard widget, an
export action or the API. An unknown slug renders an empty state naming it,
never a blank list: a blank list is indistinguishable from a query that matched
nothing. A slug is editable only while nothing cites it.

**`landingView` is where a role starts, not where it is kept.** A personal
choice always wins and Reset returns to the administered view. A role's landing
view changing mid-session applies on the next arrival: moving somebody's list
out from under them is worse than a stale default.

**`columnsPerRole` narrows `index-columns-per-scope`, never widens it.** A role
naming a column the scope does not offer gets nothing extra; a per-role list
that could add one would be a second, quieter way to put a field on screen that
the scope deliberately left off.

**`groupBy` counts the rows the list holds.** On a paged list that is a count
of the page, and the surface says so rather than showing a page count as
though it were the total.

**A view's `actions` intersect with what the reader may run** and are never
added to. A view is a thing any user can create, so a view that could add an
action would let any user grant themselves one by saving a view.

## Split view

A page declaring `splitView` opens a row beside the list rather than instead of it. The list keeps its scroll position, its selection and its loaded page, because it is hidden rather than unmounted. A handler at row 180 of 400 opens a case, closes it, and is still at row 180.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `splitView` | Object | `{}` | `{ enabled, breakpoint, paneWidth }`. Without `enabled` the page renders exactly as it does today. |
| `splitId` | String | `''` | The record the pane shows, taken from the split address. Empty closes the pane. |
| `splitCloseRoute` | String | `''` | Route name the pane's close button returns to. Defaults to the page the route names. |
| `splitCloseButton` | Boolean | `true` | Whether the pane draws its own close button, at the top of the pane on the inline end. Set false only when the `#split-pane` slot draws one from the slot's `close`. |
| `splitCloseLabel` | String | `''` | Accessible name and tooltip for that button. Defaults to `Close`. |
| `manualOrder` | Boolean | `false` | Lets this person drag the rows into an order of their own, held per user and per list. |
| `manualOrderId` | String | `''` | Stable id the order is held under. Defaults to the object type or the schema. |
| `personalColumns` | Boolean | `true` | Lets this person order and pin the table columns from the sidebar's Columns tab, and keeps the visible columns, their order and the pinned count per user and per list in their Nextcloud preferences (`columns.<list id>`; the list id is `manualOrderId`, else the page id). `false` keeps show and hide only, stored nowhere. |
| `copy` | Object | `null` | Copy settings from `config.copy`. `include` lists the link kinds a copy may take along (`relationRows`, `incoming`, `files`); the copy dialogs then list them, ticked, and the copy is one request to OpenRegister's copy endpoint. Without it a copy carries the fields only. |

Declare it on the manifest page and build the routes with [`buildManifestRoutes`](../utilities/build-manifest-routes.md), which emits the second route the pane needs:

```json
{
  "id": "Cases",
  "route": "/cases",
  "type": "index",
  "title": "Cases",
  "splitView": { "enabled": true, "breakpoint": 900 },
  "manualOrder": true
}
```

```js
const router = createRouter({
  history: createWebHashHistory(),
  routes: buildManifestRoutes(manifest, { component: CnPageRenderer, props: { manifest } }),
})
```

`CnPageRenderer` then mounts the same detail component the full route mounts into the `#split-pane` slot. Mounting your own is a second detail implementation, and it will drift from the full page within a month.

Below `breakpoint` the same address renders the record on its own, so a link sent from a laptop opens on a phone rather than as a narrow column. It falls back to the record, never to the list: answering a colleague's link with a list is the one thing the sender did not mean.

| Slot | Bindings | Description |
|------|----------|-------------|
| `split-pane` | `id`, `layout`, `close`, `saved` | The open record. `layout` is `split` or `detail`. Call `saved(record)` after a save and the row updates in place, with no refetch and no scroll reset. |

| Event | Payload | Description |
|-------|---------|-------------|
| `split-close` | | The pane was closed. |
| `split-saved` | `object` | A record saved in the pane was written onto its row. |
| `manual-order-change` | `Array<string>` | This person reordered the list. Payload is the row ids in their order. |

A manual order is stored against the person and the list, never onto the records, so two people ordering one shared list do not fight and an export carries no ordering field. The order stands down while a sort is active, because a sort the person just chose is them asking for a different order.

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `add` | — | Add button clicked (backward compat) |
| `create` | `formData` | Form dialog create confirmed. When store integration is active, payload is the saved object returned by the store. |
| `edit` | `formData` | Form dialog edit confirmed. When store integration is active, payload is the saved object returned by the store. |
| `edit-open` | `row` | Emitted **instead of** opening the edit modal when `editOpensDetail` is set. The host navigates to the record's detail page, where the whole record — not just its scalar fields — can be edited. `CnPageRenderer` binds this to the same navigation as `@view`, which is why `editOpensDetail` is opt-in: derived, it made Edit indistinguishable from opening the row. |
| `delete` | `id` | Single delete confirmed |
| `copy` | `\{ id, newName \}` | Single copy confirmed |
| `mass-delete` | `ids[]` | Mass delete confirmed |
| `mass-copy` | `\{ ids, pattern \}` | Mass copy confirmed |
| `mass-export` | `\{ ids, format \}` | Mass export confirmed |
| `mass-import` | `importData` | Mass import confirmed |
| `refresh` | — | Refresh button clicked |
| `row-aux-click` | `(row, event)` | A row or card middle-clicked, under the same conditions as `row-click`. The second argument is the native auxclick event; pass it to [`openRowTarget`](../utilities/open-row-target.md) to open the row in a new tab. A middle click never reaches `row-click`, so a `row-click` listener that navigates keeps the current tab. On a named `entitySource` page the library opens the row in a new tab itself. |
| `row-click` | `(row, event)` | Row, card, **or map marker** clicked. The second argument is the native click event (absent for a map marker or keyboard shortcut); pass it to [`openRowTarget`](../utilities/open-row-target.md) so a ctrl/cmd/shift click opens the row in a new tab. A middle click emits `row-aux-click` instead. On a named `entitySource` page the library navigates itself the same way (`rowRoute`, then the source's `rowTarget`/`openRow`/`detailRoute`). **Only fires when `selectable` is `false`** — when `selectable` is `true`, a deliberate click anywhere on a row/card toggles its selection (emitting `select`) instead — a text-selection drag is not treated as a click. In the [map view mode](#map-view-mode) a marker click resolves back to its source row and emits the identical payload, so detail-page navigation is uniform across table, cards, and map. Conceptually distinct from `view`; for click-to-open in a selectable list, use the built-in View action (`@view`). |
| `view` | `row` | Built-in View row action triggered. Conceptually "open the detail view of this row". For a non-selectable list bind alongside `row-click` (same handler) for click-to-view; for a **selectable** list, plain clicks toggle selection, so use `@view` (the eye action) as the open-detail affordance. |
| `sort` | `\{ key, order \}` | Sort changed. Cycles through `asc → desc → null` (disabled). When cleared, both `key` and `order` are `null`. |
| `page-changed` | `pageNum` | Pagination page changed |
| `page-size-changed` | `size` | Page size changed. In self-fetch mode the list has already refetched page 1 at the new size. |
| `select` | `ids[]` | Selection changed |
| `action` | `\{ action, row, id?, builtin? \}` | A row action was chosen from a row's menu, its right-click menu or the keyboard primary action. `action` is the label, `id` the action's id when it has one, and `builtin: true` marks a built-in View / Edit / Copy / Delete. |
| `search` | `term` | Search input changed in the embedded sidebar (only emitted when `sidebar.enabled`). |
| `content-search` | `boolean` | The "Also search inside files" switch changed (needs `searchInFiles`). Consumer-managed pages use it to add `_content_search` to their own query; self-fetch pages handle it themselves. |
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

A write that cannot go through `confirm`, such as an app modal that uploads files, can call
[`dispatchObjectsChanged({ register, schema })`](../utilities/dispatch-objects-changed.md)
instead. Every mounted index page for that register and schema then refreshes its list.

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
`showAdd`, `showFormDialog`, `showViewAction`, `showEditAction`, `showCopyAction`, `showDeleteAction`, `showMassImport`, `showMassExport`, `showMassCopy`, `showMassDelete`, `showViewToggle`, `selectable`. Unknown keys pass validation (forward-compat).

For a fully read-only page, prefer the all-or-nothing shortcut:

```json
"config": { "register": "...", "schema": "...", "readOnly": true }
```

This expands to nine `show*: false` defaults; explicit `config.showAdd: true` still re-enables a specific button.

### Placing built-in row actions

By default a row's menu lists the app actions from `actions` first and then the enabled built-ins in the order View, Edit, Copy, Delete. To put a built-in somewhere else, name it in `actions` with a placeholder string: `"builtin:view"`, `"builtin:edit"`, `"builtin:copy"` or `"builtin:delete"`. OpenCatalogi's Publications page uses this to read Edit, Copy, File list, Delete:

```json
"config": {
  "register": "publication",
  "schema": "publication",
  "actionToggles": { "showViewAction": false },
  "actions": [
    "builtin:edit",
    "builtin:copy",
    { "id": "file-list", "label": "File list", "icon": "FormatListBulleted", "handler": "openPublicationFiles" },
    "builtin:delete"
  ]
}
```

The rules:

- **A placeholder only places.** Whether a built-in renders is still decided by `actionToggles` / the `show*Action` props. A placeholder for a built-in that is turned off renders nothing. `validateManifest()` warns when the manifest itself turns that built-in off; the page stays silent, because a toggle turned off at runtime (a permission check, `readOnly`) is legitimate.
- **Unplaced built-ins are appended.** Every enabled built-in the array does not name goes after all other entries, in the default order. That is why the example turns View off: left on, View would be appended after Delete. A page without placeholders renders exactly as before.
- **An object is always an app action**, whatever its `id`. `{ "id": "edit", "label": "Open editor" }` renders beside the built-in Edit, not instead of it. In a manifest an object's `id`, when present, must be a string.
- **Each placeholder at most once.** A repeated placeholder, an unknown one such as `"builtin:archive"`, a bare string such as `"edit"`, an object whose `id` starts with `builtin:` and an object that sets a `builtin` key are all manifest schema errors. Placeholders are refused on every page type other than `index`.
- **Delete last, by convention.** Placing `"builtin:delete"` before other entries is honoured, but `validateManifest()` returns a warning (not an error) when Delete is not the last entry of the rendered order, appended built-ins included. The page logs the same warning in development builds.

A named `entitySource` may place built-ins in its own `rowActions` the same way; the manifest's `actions`, when declared, still wins over the source's.

**What placement changes.** The order of the actions menu, and therefore the keyboard primary action (`p` with `listShortcuts`), which runs the first entry the menu shows and enables (a hidden or disabled entry is skipped): in the example it becomes Edit instead of File list. It does not change which entries show as inline icons: `CnRowActions` collapses into the overflow menu above three entries and renders an entry inline only when it is the only one. A future `inline` setting would show the first entries as icons, so placement would then decide those too.

**Testids and the `action` event.** A built-in's `data-testid` is `cn-action-item-<id>` (`cn-action-item-edit`, and so on) in every locale; an app action keeps the slug of its label. The `action` event payload keeps `action` as the label and adds the action's `id`, plus `builtin: true` for a built-in, so an app action with `id: "edit"` and the built-in Edit stay distinguishable. A row's availability block (`rowActionField`, default `@self.actions`) matches a built-in by its id, never by its label, and also by the OpenRegister permission verb that governs it: `read` permits View and Copy, `update` permits Edit, `delete` permits Delete. A built-in shows when the block allows either; a block allowing neither hides it. An app action sharing a built-in id matches by its id only. A verb refused with a reason hands that reason to the built-in through `rowActionRefusal(row, action)`, unless its own id allows it, and a reason on the built-in's own id wins over the verb's. `rowActionRefusal` maps the verb only when handed the built-in action itself, such as the action from the `action` event payload or `{ id: 'edit', builtin: true }`; a plain `{ id: 'edit' }` matches by its id only. `rowActionsNotDeclared(row)` does not list a verb that a declared built-in uses.

**Library version.** The placeholders ship in the manifest schema `2.50.0`. An app that adopts them MUST raise its `@conduction/nextcloud-vue` range to the release that ships them in the same change: an older library rejects the manifest, and `useAppManifest` then falls back to the unresolved bundled manifest, losing the backend manifest merge and `@resolve:` sentinel resolution on every page, not just the row order.

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

### A failed fetch

When the latest fetch fails (OpenRegister answers a search term it cannot parse, such as an unbalanced bracket in `verzoek (2026`, with HTTP 400), the page shows an error state ("An error occurred") where the empty state would be, instead of the rows and "Showing X of Y" counter of the previous query, which the object store keeps on a failure. The server's own message is not shown; the state instead suggests changing the search or trying again when a search term is set, and trying again later when none is. The next successful fetch, for example after the search term is corrected, brings the results back, and so does a successful [live-update](#live-updates--collection-subscription) refetch, so a transient failure does not outlast the next background fetch. Only the most recently started fetch decides whether the error state shows, judged by that request's own response, so an older response that settles late cannot turn it on or off. That holds when an older failure lands while a newer request is still in flight, and for a refresh that joins an identical request already in flight. The `#empty` slot is not used for this state, and consumer-managed mode (`objects` supplied) is unaffected.

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

In self-fetch mode the page also **subscribes to live collection updates** for its `or-collection-{register}-{schema}` scope (via [`useObjectSubscription`](../utilities/composables/use-object-subscription.md) and the store's [`liveUpdatesPlugin`](../store/plugins/live-updates.md)). When another user creates, updates, or deletes an object in the register/schema pair, the list refetches with its **current** params (page, sort, search, filters) — events are hints, so bursts (mass import, bulk edits) are coalesced into at most one refetch per ~750 ms window, deduped against in-flight requests. When notify_push is unavailable the transport falls back to visibility-gated polling; nothing else changes for the page.

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

### Mixed-schema collections (`collectionUrl`)

Set `collectionUrl` to list from an endpoint that searches several register/schema pairs at once, such as an app's catalog API. The endpoint takes `_page`, `_limit`, `_search` and `_order[key]=dir`, and answers `{ results, total, page, pages }`.

```vue
<CnIndexPage
  title="Publications"
  register="19"
  schema="24"
  :collection-url="generateUrl('/apps/opencatalogi/api/{slug}', { slug })" />
```

`register` and `schema` remain the page's own pair. They drive the columns, the Add button, export and import.

A row whose `@self.register` / `@self.schema` names another pair behaves as a row of that pair:

- Edit opens the form with that pair's schema. The page's `includeFields`, `excludeFields` and `fieldOverrides` are not applied to it.
- Save, delete, mass delete and copy go to that pair's own URL. A selection kept across pages stays on each row's own pair.
- If that pair's schema can't be loaded, the form does not open and an error toast is shown.

`register` may be a slug. The page then loads the register once to match it against the rows' `@self.register` ids; passing ids skips that request.

Keep the columns to ones every pair has, such as `@self.name`, `@self.updated` and shared properties. Live updates follow the page's own pair only. In this mode, any `dispatchObjectsChanged` signal refreshes the list.

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

Right-clicking any table row opens a context menu at the cursor position. It is the same menu as that row's three-dot actions menu: CnIndexPage passes it `rowActionsFor(row)`, the same per-row list the table, list and card menus render, so it has the same entries in the same order, after the same `@self.actions` narrowing and the same `visible` / `visibleWhen` rules. Each entry carries the same key, testid and `action` payload in both menus. No app-side changes are needed.

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

`actions[]` items declared in `pages[].config.actions` (manifest path) accept a string `handler`, and so do `bulkActions[]` and `headerActions[]`. All three resolve the name the same way: the v2 `registry` first — an entry of `kind: "handler"` exposing the function as `.handler` (or `.fn`), or a directly function-valued entry — then the deprecated `customComponents` map, which keeps an app that has not migrated working unchanged. A name that matches something registered but uncallable (a component where a function belongs) warns and falls back to emit-only; an unknown name falls back silently.

```js
// registry.js — the v2 home for a manifest-named behaviour
export default {
  claimCase: { kind: 'handler', handler: claimCase },
}
```

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

Registry entry (`src/registry.js`):

```js
export function queueProcessHandler({ actionId, item }) {
  // open the right modal, dispatch a store action, etc.
  store.processQueue(item.id)
}

export default {
  // …existing component entries…
  queueProcessHandler: { kind: 'handler', handler: queueProcessHandler },
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
// src/registry.js
import OrganisatieCard from './components/cards/OrganisatieCard.vue'
export default \{ OrganisatieCard: \{ kind: 'page', component: OrganisatieCard \} \}
```

```vue
<!-- App.vue -->
<CnAppRoot
  :manifest="manifest"
  app-id="softwarecatalog"
  :registry="registry">
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

Set `documentationUrl` (and optionally `documentationLabel`) to surface a **Documentation** entry in the [`CnActionsBar`](./cn-actions-bar.md) overflow menu, alongside the built-in Request-a-feature item. It opens the link in a new tab. Empty (the default) hides it.

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
| `listComponent` | String | `''` | Custom row component, resolved against the v2 `registry` (any kind carrying a `component`) and then the legacy `customComponents` map. |
| `showSortSelect` | Boolean | `false` | Show a standalone sort dropdown in the actions bar. |
| `sortSelectOptions` | Array | `[]` | Options `{ value, label }` for the sort dropdown. |
| `sortSelectValue` | String | `''` | Selected sort dropdown value (controlled). |

The `#list-item`, `#row-icon`, `#row-badges`, and `#row-actions` slots override the list rows (see [CnObjectList](./cn-object-list.md)). Emits `@sort-change` with the chosen sort value.

## Folder sidebar

Set the `folderSidebar` config to render a folder navigation pane left of the list. Selecting a folder filters the list by the config's `filterField` (via the self-fetch filter); "All" clears it. Emits `@folder-change` with the selected id (and `@folder-create` when the opt-in New-folder button is used). While a folder is selected the pane keeps showing the whole set of folders it saw before the selection, so switching from one folder to another is one click; the live facet of the narrowed query would otherwise list the selected folder alone.

#### A folder that carries its own schema

A folder entry may declare `schema` (and optionally `register`, which defaults to the page's own). While that folder is selected, the page lists that register and schema instead of its own: columns, fetch, pagination, facets and the live-update subscription all follow it. "All", or a folder without `schema`, restores the page's own register and schema. Switching clears the row selection and closes any open form, delete or copy dialog, since a row of the old schema means nothing under the new one. A folder without `schema` filters the page's schema by `filterField` exactly as before.

```json
"folderSidebar": {
  "source": "custom",
  "folders": [
    { "id": "people", "name": "People" },
    { "id": "orgs", "name": "Organisations", "schema": "kvkCompany" }
  ]
}
```


Sources: `register` (fetch the folder list from an OpenRegister `register`/`schema`, mapping `idField`/`nameField`), `field` (distinct values of the current rows' `field`), `custom` (explicit `folders`), or `files` (Nextcloud folders). Example — case types as folders that filter cases:

```json
"folderSidebar": {
  "source": "register", "register": "procest", "schema": "caseType",
  "idField": "@self.uuid", "nameField": "title",
  "filterField": "caseType", "allLabel": "All cases"
}
```


## A count in the subtitle (`countSubtitle`)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `countSubtitle` | `String` | `''` | A description with `{total}` replaced by the collection's total: `"{total} open cases"` reads "48 open cases". Shown in place of `description` once a total is known; before that `description` shows. Goes through the host translate function. Manifest: `config.countSubtitle`, beside `config.showTitle: true`. |

## The board header: `showTitleIcon`, `showCount`, `headerButtons`

- `showTitleIcon` (default `true`): `false` drops the icon before the title.
- `showCount` (default `true`): `false` drops the actions bar's "Showing 20 of 258" line, for a page whose `countSubtitle` already gives the total.
- `headerButtons` (default `[]`): buttons beside the title, each `{ label?, action, variant?, icon?, format?, id? }`. `action` is `add` (the Add flow; the label defaults to the Add label), `export` (the export leaf in `format`, `csv` by default, else the export dialog), `actions-menu` (the page's header actions as one labelled menu button, absent when there are none), `import`, `refresh`, or the id of a `headerActions` entry. `variant` is `primary` or `secondary` (default). They show only with `showTitle` and without a `#header` slot; when they show, the actions bar drops its Views and Actions menus, and its Add button and Export menu when a button takes that action.

```json
{ "showTitle": true, "showTitleIcon": false, "showCount": false, "countSubtitle": "{total} open cases",
  "headerButtons": [{ "label": "Export", "action": "export" }, { "label": "New case", "action": "add", "variant": "primary" }] }
```

## Reference columns that show a label (`labelField`)

A column object over a `$ref` property can name the field of the referenced object to show instead of its uuid:

```json
{ "key": "case", "labelField": "title", "link": true }
```

- The page collects the distinct ids of the rows on screen and asks for them in one request per referenced schema (`useRefLabels`). Rows render first; labels fill in place.
- The label is `labelField` (dotted paths such as `person.displayName` work), then `title`, `name` or `@self.name`. An id that cannot be resolved (a deleted object) shows the id in mono.
- `link: true` links the label to the detail page the manifest declares for the referenced schema (`type: "detail"`, `config.schema`); `route` names the page id explicitly.
- Sorting by the key would sort by id, so such a column is not sortable unless it sets `sortByLabel: true` (use it when the store can sort the extended field).
- A facet over the same column lists the labels in the sidebar; the filter value stays the id.
- The column needs the `$ref` on the page schema and a register: the schema's `x-external-register`, or the page's `register`. A column that already sets `widget` is left alone.
- The labels are refetched after `setFormResult({ success: true })`.

## Personal lenses and the star column

| Prop (manifest `config.*`) | Type | Default | Description |
|------|------|---------|-------------|
| `personalLenses` | Array | `[]` | Any of `favourite`, `recent`, `watching`: quick filters Favourites (`_favourite`), Recent (`_recent`) and Following (`_watching`), appended after the page's own quick filters. They combine with every other filter. While Recent is active column sorting is off, because the lens owns the order. A page with no quick filters of its own gets an "All" tab first. |
| `showFavouriteColumn` | Boolean | `false` | Adds a first column with a [`CnFavouriteToggle`](./cn-favourite-toggle.md) per row, bound to the row's `@self.favourite`. Clicking it does not open the row. |

The `personalLenses` value `unread` adds the quick filter Unread (`_unread=true`). Rows whose `@self.unread` is true show a [`CnUnreadMarker`](./cn-unread-marker.md) in the first cell and read in bold, with no prop needed.

## Shared saved views

With `allowSavedViews`, views shared with the user list under "Shared with me" in the saved-views control. Saving a view can share it with groups (read or write); an own view has a Share entry; a view shared with write access can be saved to with the current state (the body never carries `sharedWith` or `owner`); a view shared read-only can be copied with "Save as my view". See [`CnSavedViewsControl`](./cn-saved-views-control.md#views-shared-with-the-user).

## The board look: `look`, `countText`, `footerNote`, `bulkHint`, `cardFields`

With `look: "board"` (the page's `look` prop or `config.look`, else the app's `look`) the index page is drawn as the DqZaken list of the screens. Without it nothing changes.

- **Header**: no icon; the title (28px), the count line and the buttons. `countText` is a template with `{shown}` (rows on this page), `{total}` and free text, default `"{shown} of {total}"`. The buttons render in a fixed order whatever the manifest declares: `export` (labelled "Download" by default), `actions-menu`, any other secondary button, the buildiq square, the primary button.
- **Toolbar**: no band. Row 1 holds the saved-view chips (with their counts; the selected one filled), a "Save view" button, the labelled Filter button with the number of active filters, and the view switch (icon-only segments in the order table, cards, board, map). Row 2 holds the search field and, when filters are active, "Active:", one removable chip per filter and "Clear all".
- **Bulk band**: its own row between the toolbar and the table, only while rows are selected: "With the selected &lt;plural&gt;", the bulk actions and the optional `bulkHint`.
- **Table card**: white, radius 12, no shadow; one 34px menu button per row named "Actions for &lt;title&gt;".
- **Footer**: inside the card (and under the card grid): the count text, `footerNote` after it, and numbered page links with Previous and Next. No First, Last or page-size select.
- **Cards view**: the same header, toolbar and footer; `cardFields` (default: the first four list columns) names the facts shown on each card.

```json
{ "look": "board", "showTitle": true, "countText": "{shown} of {total} open cases in your teams",
  "footerNote": "click a column header to sort", "bulkHint": "See what changes first, then run it",
  "headerButtons": [{ "action": "add", "variant": "primary", "label": "New case" }, { "action": "export" }, { "action": "actions-menu" }] }
```

## The row menu edits when the row opens the detail

When a click on a row navigates to the record's detail page, the built-in View is left out of that row's menu (and of the right-click menu): viewing is what the click does. The menu offers Edit (Dutch "Bewerken", pencil icon). A row whose `viewTo` answers `null`, or a page with no row-click target, keeps View. Actions the page declares itself are not touched. The rule applies in every look.

## Stat row and side panel (`statRow`, `sidePanel`)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `statRow` | `Array` | `[]` | KPI tiles above the list (manifest `config.statRow`): widget definitions `{ id, type, title?, content }`, usually `type: "stat"`, drawn between the header and the toolbar in an auto-fit row (each tile at least 200px), in the listed order. |
| `sidePanel` | `Array` | `[]` | Cards beside the list (manifest `config.sidePanel`): widget definitions `{ id, type, title?, content, headerLink? }` in a 300px column right of the toolbar and the list. Below 1024px the column sits above the toolbar. |

Types resolve like dashboard widgets: the app's widget registry first, then the dashboard catalog (`stat`, `table`, `people`, `stats-block` and the rest). An entry without an id, or with a type nothing resolves, is skipped with a development warning.

```json
{
  "statRow": [
    { "id": "unassigned", "type": "stat", "content": { "label": "Without handler", "endpointSource": { "url": "/apps/dossiq/api/queue/kpis" }, "valueField": "unassigned" } }
  ],
  "sidePanel": [
    { "id": "team", "type": "TeamToday", "title": "Team today" }
  ]
}
```
