Basic — add button, refresh, and pagination count:

```vue
<template>
  <CnActionsBar
    :pagination="{ total: 128 }"
    :object-count="20"
    add-label="Add client"
    :show-view-toggle="false"
    :show-mass-import="false"
    :show-mass-export="false"
    :show-mass-copy="false"
    :show-mass-delete="false"
    @add="last = 'add'"
    @refresh="last = 'refresh'" />
  <p style="font-size: 13px; margin-top: 8px;">Last action: {{ last || '—' }}</p>
</template>
<script>
export default {
  data() { return { last: '' } }
}
</script>
```

With view toggle and selection count:

```vue
<template>
  <CnActionsBar
    :pagination="{ total: 250 }"
    :object-count="20"
    :selected-ids="selectedIds"
    :view-mode="viewMode"
    add-label="Add item"
    :show-mass-delete="true"
    :show-mass-copy="true"
    :show-mass-export="true"
    :show-mass-import="true"
    @add="last = 'add'"
    @refresh="last = 'refresh'"
    @view-mode-change="viewMode = $event"
    @show-delete="last = 'delete '"
    @show-copy="last = 'copy'"
    @show-export="last = 'export'"
    @show-import="last = 'import'" />
  <p style="font-size: 13px; margin-top: 8px;">View: {{ viewMode }} · Last: {{ last || '—' }}</p>
</template>
<script>
export default {
  data() {
    return {
      viewMode: 'table',
      selectedIds: ['id-1', 'id-2'],
      last: '',
    }
  },
}
</script>
```

Refreshing state:

```vue
<template>
  <CnActionsBar
    :pagination="{ total: 42 }"
    :object-count="20"
    :refreshing="refreshing"
    :show-view-toggle="false"
    add-label="Add item"
    @refresh="doRefresh" />
</template>
<script>
export default {
  data() { return { refreshing: false } },
  methods: {
    doRefresh() {
      this.refreshing = true
      setTimeout(() => { this.refreshing = false }, 1500)
    },
  },
}
</script>
```

Disabled controls and custom add icon — `addDisabled`, `refreshDisabled`, `addIcon`, `showAdd`, and `selectable`:

```vue
<CnActionsBar
  :pagination="{ total: 10 }"
  :object-count="10"
  add-label="Add schema"
  add-icon="DatabasePlus"
  :add-disabled="true"
  :refresh-disabled="false"
  :show-add="true"
  :selectable="false"
  :show-view-toggle="false"
  :show-mass-import="false"
  :show-mass-export="false"
  :show-mass-copy="false"
  :show-mass-delete="false"
  @add="() => {}"
  @refresh="() => {}" />
```

Controlling the inline action button count — `inlineActionCount` sets how many custom actions are shown inline (the rest go to the overflow dropdown):

```vue
<CnActionsBar
  :pagination="{ total: 50 }"
  :object-count="10"
  add-label="Add"
  :inline-action-count="3"
  :show-view-toggle="false"
  @add="() => {}"
  @refresh="() => {}">
  <template #action-items>
    <!-- NcActionButton items placed here respect inlineActionCount -->
  </template>
  <template #filters>
    <!-- Inline filter controls (e.g. CnQuickFilterBar) rendered in the bar,
         between the view toggle and the add/actions. -->
  </template>
</CnActionsBar>
```

### Slots

- `after-search` — Refinement controls rendered beside the search field on the LEFT side of the bar (e.g. an `NcActions` filter menu with a funnel icon). Convention: the left side groups "narrow what you see" (search + filters); the right cluster stays "display + act" (view toggle, sort, add, overflow).
- `selection-actions` — The host's bulk-action buttons (NcButton family) inside the contextual selection strip that appears while `selectable` and a selection is active. Scope: `{ count, selectedIds }`. The strip carries a live `role="status"` count (WCAG 2.1 SC 4.1.3), the built-in Copy/Delete-selected buttons when those mass actions are enabled, and a Clear control emitting `clear-selection`. Keep the same actions listed in `#mass-actions` as the menu inventory.
- `filters` — Inline filter controls rendered inside the bar, between the view toggle and the add/actions (e.g. a `CnQuickFilterBar` segmented toggle).
- `action-items` — Extra `NcActionButton` items injected into the overflow menu (respects `inlineActionCount`).
- `header-actions`, `mass-actions` — see the props/events above.

## Additional props

| Prop | Type | Default | Description |
|---|---|---|---|
| `selectable` | `Boolean` | `true` | Whether rows/cards can be selected (controls whether mass-action state is meaningful) |
| `addIcon` | `String` | `''` | MDI icon name for the Add button (e.g. `'AccountGroup'`). Falls back to a Plus icon when empty |
| `inlineActionCount` | `Number` | `2` | How many custom `#action-items` buttons to show inline before moving them to the overflow dropdown |
| `refreshDisabled` | `Boolean` | `false` | Disable the Refresh action (e.g. while a required selection is missing) |
| `addDisabled` | `Boolean` | `false` | Disable the Add button (e.g. while a required selection is missing) |
| `showAdd` | `Boolean` | `true` | Whether to render the Add button at all |
| `cardsLabel` | `String` | `''` | Label for the cards/grid view-toggle option (defaults to "Cards") |
| `tableLabel` | `String` | `''` | Label for the table/list view-toggle option (defaults to "Table") |
| `cardsIcon` | `String` | `''` | MDI icon name for the cards option (defaults to the built-in grid icon). Resolved via `CnIcon` |
| `tableIcon` | `String` | `''` | MDI icon name for the table option (defaults to the built-in list icon). Resolved via `CnIcon` |
| `showMap` | `Boolean` | `false` | Whether to render the third "Map" view-toggle segment. Off by default so existing two-segment consumers are unchanged |
| `mapLabel` | `String` | `''` | Label for the map view-toggle option (defaults to "Map"). Only shown when `showMap` |
| `mapIcon` | `String` | `''` | MDI icon name for the map option (defaults to the built-in map-marker icon). Resolved via `CnIcon` |
| `showSearch` | `Boolean` | `false` | Whether to show the inline search field on the left of the bar |
| `searchValue` | `String` | `''` | Current value of the inline search field (controlled) |
| `searchPlaceholder` | `String` | `''` | Placeholder / accessible label for the inline search field |
| `headerActions` | `Array` | `[]` | Manifest-declared page-level actions rendered inside the overflow dropdown between the built-in Refresh and the `#action-items` slot. Each entry is `{ id, label, icon?, disabled? }` — the bar emits `@header-action({ action: id, id })` on click and the parent (e.g. `CnIndexPage`) dispatches the resolved handler. The `icon` field accepts EITHER an MDI Vue component name (e.g. `'History'`) — rendered via `CnIcon` — OR a Nextcloud core CSS icon class (e.g. `'icon-history'`) — rendered as a `<span>` carrying that class. |

## Manifest header actions example

```vue
<CnActionsBar
  :pagination="{ total: 42 }"
  :object-count="20"
  add-label="Add"
  :header-actions="[
    { id: 'view-logs', label: 'View logs', icon: 'icon-history' },
    { id: 'open-api', label: 'Open API', icon: 'Api' },
  ]"
  @header-action="onHeaderAction" />
```

## Events

| Event | Payload | Description |
|---|---|---|
| `header-action` | `{ action: <id>, id: <id> }` | Fired when a `headerActions[]` entry is clicked. The `action` field aliases `id` for forward-compat with the row-level `@action` event. |

## Request-a-feature

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `showRequestFeature` | Boolean | `false` | Show a built-in "Request a feature" entry in the overflow (after Refresh + headerActions). Emits `@request-feature`. |

## Documentation link

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `documentationUrl` | String | `''` | When set, adds a **Documentation** entry to the overflow (before Request a feature) that opens the link in a new tab. Empty hides it. |
| `documentationLabel` | String | `t('Documentation')` | Pre-translated Documentation entry label. |

### Additional props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `showSidebarToggle` | Boolean | `false` | Whether to show the Search/Columns sidebar toggle button (lets the index sidebar default to closed and open on demand). |
| `sidebarOpen` | Boolean | `false` | Current open state of the sidebar (controls the toggle button's pressed state). |
| `availableViewModes` | Array | `['cards','table']` | Which view-mode segments to show, in order (add `list`). |
| `listLabel` | String | `''` | Label for the list view-toggle option. |
| `listIcon` | String | `''` | MDI icon for the list view-toggle option. |
| `showSortSelect` | Boolean | `false` | Show a standalone sort dropdown (card/list views). |
| `sortOptions` | Array | `[]` | Options `{ value, label }` for the sort dropdown. |
| `sortValue` | String | `''` | Selected sort option value (controlled). |
| `sortLabel` | String | *(i18n)* | Accessible label for the sort dropdown. |
