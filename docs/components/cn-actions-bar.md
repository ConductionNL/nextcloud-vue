import Playground from '@site/src/components/Playground'
import GeneratedRef from './_generated/CnActionsBar.md'

# CnActionsBar

Toolbar that combines an item count display, a primary Add button, a view-mode toggle (Cards / Table), and an overflow actions menu containing Refresh, Import, Export, Copy-selected, and Delete-selected. All built-in mass actions are individually toggle-able.

**Wraps**: NcButton, NcActions, NcCheckboxRadioSwitch

## Try it

<Playground component="CnActionsBar" />

## Usage

```vue
<CnActionsBar
  :pagination="pagination"
  :object-count="items.length"
  :selected-ids="selectedIds"
  add-label="Add Client"
  add-icon="AccountGroup"
  @add="createNew"
  @refresh="reload"
  @show-import="openImport"
  @show-export="openExport"
  @show-copy="openMassCopy"
  @show-delete="openMassDelete"
  @view-mode-change="viewMode = $event" />
```

Custom action items can be injected into the overflow menu:

```vue
<CnActionsBar ...>
  <template #action-items>
    <NcActionButton @click="openReport">
      <template #icon><ChartBar :size="20" /></template>
      Export report
    </NcActionButton>
  </template>
</CnActionsBar>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `pagination` | Object | `null` | Pagination state `{ total, page, pages, limit }` — used to render "Showing X of Y" |
| `objectCount` | Number | `0` | Number of currently visible items |
| `selectable` | Boolean | `true` | Whether rows/cards can be selected |
| `selectedIds` | Array | `[]` | Currently selected item IDs — controls disabled state of mass actions |
| `addLabel` | String | `'Add'` | Label for the primary Add button |
| `addIcon` | String | `''` | MDI icon name for the Add button (falls back to Plus) |
| `showAdd` | Boolean | `true` | Whether to show the Add button |
| `addDisabled` | Boolean | `false` | Whether the Add button is disabled |
| `viewMode` | String | `'table'` | Current view mode: `'table'` or `'cards'` |
| `showViewToggle` | Boolean | `true` | Whether to show the Cards/Table toggle |
| `refreshing` | Boolean | `false` | Whether a refresh is currently in progress |
| `refreshDisabled` | Boolean | `false` | Whether the Refresh action is disabled |
| `showMassImport` | Boolean | `true` | Whether to show the Import action |
| `showMassExport` | Boolean | `true` | Whether to show the Export action |
| `showMassCopy` | Boolean | `true` | Whether to show the Copy selected action |
| `showMassDelete` | Boolean | `true` | Whether to show the Delete selected action |
| `inlineActionCount` | Number | `2` | How many actions to show inline (rest go in overflow) |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `add` | — | Add button clicked |
| `refresh` | — | Refresh action triggered |
| `view-mode-change` | `'table'` \| `'cards'` | View toggle changed |
| `show-import` | — | Import action triggered |
| `show-export` | — | Export action triggered |
| `show-copy` | — | Copy selected action triggered |
| `show-delete` | — | Delete selected action triggered |

### Slots

| Slot | Scope | Description |
|------|-------|-------------|
| `header-actions` | — | Extra buttons placed after the Add button, before the overflow menu |
| `action-items` | — | Extra `NcActionButton` items injected into the overflow menu |
| `mass-actions` | `{ count, selectedIds }` | Extra mass-action items at the bottom of the overflow menu |

## Reference (auto-generated)

The tables below are generated from the SFC source via `vue-docgen-cli`. They reflect what's actually in [`CnActionsBar.vue`](https://github.com/ConductionNL/nextcloud-vue/blob/beta/src/components/CnActionsBar/CnActionsBar.vue) and update automatically whenever the component changes.

<GeneratedRef />
