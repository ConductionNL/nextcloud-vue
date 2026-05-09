---
sidebar_position: 15
---

import Playground from '@site/src/components/Playground'
import GeneratedRef from './_generated/CnMassActionBar.md'

# CnMassActionBar

Mass action dropdown button for selected items. Appears when items are selected in a table or card grid.

**Wraps**: NcActions, NcActionButton

## Try it

<Playground component="CnMassActionBar" />

![CnMassActionBar showing bulk action options (Import, Export, Copy, Delete)](/img/screenshots/cn-mass-action-bar.png)

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `selectedIds` | Array | `[]` | Selected item IDs |
| `count` | Number | `0` | Number of selected items |
| `showImport` | Boolean | `true` | Show mass import action |
| `showExport` | Boolean | `true` | Show mass export action |
| `showCopy` | Boolean | `true` | Show mass copy action |
| `showDelete` | Boolean | `true` | Show mass delete action |
| `menuLabelTemplate` | String | `'Mass Actions (\{count\})'` | |
| `importLabel` | String | | Import action label |
| `exportLabel` | String | | Export action label |
| `copyLabel` | String | | Copy action label |
| `deleteLabel` | String | | Delete action label |

## Events

| Event | Description |
|-------|-------------|
| `mass-import` | Import action triggered |
| `mass-export` | Export action triggered |
| `mass-copy` | Copy action triggered |
| `mass-delete` | Delete action triggered |

## Slots

| Slot | Scope | Description |
|------|-------|-------------|
| `#actions` | `\{ count, selectedIds \}` | Custom mass action buttons |

## Usage

```vue
<CnMassActionBar
  :selected-ids="selected"
  :count="selected.length"
  @mass-delete="onMassDelete"
  @mass-export="onMassExport">
  <template #actions="{ count }">
    <NcActionButton @click="onCustomAction">
      Custom Action ({{ count }})
    </NcActionButton>
  </template>
</CnMassActionBar>
```

## Reference (auto-generated)

The tables below are generated from the SFC source via `vue-docgen-cli`. They reflect what's actually in [`CnMassActionBar.vue`](https://github.com/ConductionNL/nextcloud-vue/blob/beta/src/components/CnMassActionBar/CnMassActionBar.vue) and update automatically whenever the component changes.

<GeneratedRef />
