---
sidebar_position: 25
---

import Playground from '@site/src/components/Playground'
import GeneratedRef from './_generated/CnConfigurationCard.md'

# CnConfigurationCard

Configuration card with title, actions, and status indicator. Used for feature toggles and service configurations.

## Try it

<Playground component="CnConfigurationCard" />

![CnConfigurationCard showing register and schema mapping configuration](/img/screenshots/cn-configuration-card.png)

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | String | `''` | Card title |

## Slots

| Slot | Description |
|------|-------------|
| `default` | Card content |
| `#icon` | Icon displayed in the card header |
| `#actions` | Action buttons in the card header |
| `#status` | Custom status indicator |
| `#footer` | Footer content below the card body |

## Usage

```vue
<CnConfigurationCard
  title="Elasticsearch"
  description="Full-text search engine"
  status="active"
  status-label="Connected">
  <NcTextField label="Host" v-model="esHost" />
  <template #actions>
    <NcButton @click="testConnection">Test Connection</NcButton>
  </template>
</CnConfigurationCard>
```

## Reference (auto-generated)

The tables below are generated from the SFC source via `vue-docgen-cli`. They reflect what's actually in [`CnConfigurationCard.vue`](https://github.com/ConductionNL/nextcloud-vue/blob/beta/src/components/CnConfigurationCard/CnConfigurationCard.vue) and update automatically whenever the component changes.

<GeneratedRef />
