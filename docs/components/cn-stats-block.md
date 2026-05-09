---
sidebar_position: 11
---

import Playground from '@site/src/components/Playground'
import GeneratedRef from './_generated/CnStatsBlock.md'

# CnStatsBlock

Statistics display card with icon, count, and optional breakdown. Used inside CnKpiGrid.

**Wraps**: NcLoadingIcon

## Try it

<Playground component="CnStatsBlock" />

![CnStatsBlock showing pipeline statistics](/img/screenshots/cn-stats-block.png)

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | String | `''` | Card title |
| `count` | Number | `0` | Main count value (formatted with toLocaleString) |
| `countLabel` | String | `'objects'` | Unit label below count |
| `breakdown` | Object | `null` | Key-value pairs for breakdown display |
| `loading` | Boolean | `false` | Loading state |
| `loadingLabel` | String | `'Loading...'` | |
| `emptyLabel` | String | `'No items found'` | |
| `icon` | Component | `null` | MDI icon component |
| `iconSize` | Number | `24` | Icon pixel size |
| `variant` | String | `'default'` | `'default'`, `'primary'`, `'success'`, `'warning'`, `'error'` |
| `horizontal` | Boolean | `false` | Icon-left layout |
| `clickable` | Boolean | `false` | Enable click interaction |
| `showZeroCount` | Boolean | `false` | Display 0 as a count value instead of the empty label |
| `route` | Object | `null` | Vue Router location object (`{ name, path, query, ... }`). When set, the card renders as a `<router-link>` and clickable styles are applied automatically. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `click` | `event` | Block clicked (only if clickable) |

## Slots

| Slot | Description |
|------|-------------|
| `#icon` | Custom icon content |

## Usage

```vue
<CnStatsBlock
  title="Active Contacts"
  :count="150"
  count-label="contacts"
  variant="primary"
  :breakdown="{ 'This week': 12, 'This month': 43 }"
  :icon="AccountGroupOutline"
  :clickable="true"
  @click="navigateToContacts" />
```

## Reference (auto-generated)

The tables below are generated from the SFC source via `vue-docgen-cli`. They reflect what's actually in [`CnStatsBlock.vue`](https://github.com/ConductionNL/nextcloud-vue/blob/beta/src/components/CnStatsBlock/CnStatsBlock.vue) and update automatically whenever the component changes.

<GeneratedRef />
