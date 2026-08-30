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
| `error` | String \| Boolean \| Object | `null` | The tile could not load its number. Anything truthy counts — pass the caught error itself, or `true`. Shows a dash and `errorLabel` instead of a count, tints the tile `error`, and suppresses the breakdown. **Takes precedence over `count`, `loading` and `emptyLabel`.** |
| `errorLabel` | String | `'Unavailable'` | Text shown in place of the count when `error` is set. |
| `icon` | Component | `null` | MDI icon component |
| `iconSize` | Number | `24` | Icon pixel size |
| `variant` | String | `'default'` | `'default'`, `'primary'`, `'success'`, `'warning'`, `'error'` |
| `horizontal` | Boolean | `false` | **Deprecated since 2.25.0** — icon-left is the canonical card's own layout, so this prop no longer changes anything. Kept for existing callers. |
| `vertical` | Boolean | `false` | Stack the icon above a centred number instead of placing it beside one. |
| `filled` | Boolean | `false` | Draw the card's own grey box. Off by default: the block normally sits inside a wrapper that already draws a card, and a second box reads as a card inside a card. |
| `clickable` | Boolean | `false` | Enable click interaction |
| `showZeroCount` | Boolean | `false` | Display 0 as a count value instead of the empty label |
| `route` | Object | `null` | Vue Router location object (`{ name, path, query, ... }`). When set, the card renders as a `<router-link>` and clickable styles are applied automatically. |

## Error state

A tile that cannot load its number must not render one.

```vue
<CnStatsBlock
  :title="t('myapp', 'Overdue')"
  :count="count"
  :loading="loading"
  :error="error" />
```

`error` beats `count`, `loading` and `emptyLabel`, in that order of importance:

- **over `count`** — a tile that fetched 42 and then failed to refresh must not
  keep presenting 42 as current.
- **over `loading`** — a failed load is finished, not in progress.
- **over `emptyLabel`** — "we could not read this" and "there is nothing here"
  mean opposite things to a reader, and used to look identical.

This exists because the alternative was observed in production: eleven tiles
across five apps answered a failed fetch with `catch { count = 0 }`. A
dashboard with a dead backend looked like a dashboard reporting genuinely empty
collections, and zero is a number a reader believes.

The tile tints itself — do not also pass `variant="error"`. Two props for one
state means forgetting the second, and forgetting it is invisible: "Unavailable"
in the default colour reads as ordinary content. An explicit `variant` is
ignored while `error` is set.

An empty string is **not** an error: a caller clearing its message back to `''`
is reporting recovery.

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `click` | `event` | Block clicked (only if clickable) |

## Slots

| Slot | Bindings | Description |
|------|----------|-------------|
| `#icon` | — | Custom icon content |
| `#value` | `count` (number), `formatted` (string) | Override the prominently-displayed value with a pre-formatted string (currency, percent, a `—` placeholder, …). `count` stays the raw number — this is presentation only. Defaults to the localized count. When provided, the value area always renders (even at count 0). |

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

### Formatted value via the `#value` slot

Keep `count` numeric and format the displayed value in the slot (currency, percent, a `—` placeholder):

```vue
<CnStatsBlock title="Total Pipeline Value" :count="totalValue" count-label="open opportunities">
  <template #value>{{ formatCurrency(totalValue) }}</template>
</CnStatsBlock>

<CnStatsBlock title="Win Rate" :count="winRate ?? 0" count-label="closed deals">
  <template #value>{{ winRate === null ? '—' : Math.round(winRate * 100) + '%' }}</template>
</CnStatsBlock>
```

## Reference (auto-generated)

The tables below are generated from the SFC source via `vue-docgen-cli`. They reflect what's actually in [`CnStatsBlock.vue`](https://github.com/ConductionNL/nextcloud-vue/blob/beta/src/components/CnStatsBlock/CnStatsBlock.vue) and update automatically whenever the component changes.

<GeneratedRef />
