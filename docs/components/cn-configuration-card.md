---
sidebar_position: 25
---

# CnConfigurationCard

Configuration card with title, actions, and status indicator. Used for feature toggles and service configurations.


![CnConfigurationCard showing register and schema mapping configuration](/img/screenshots/cn-configuration-card.png)

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | String | `''` | Card title |
| `description` | String | `''` | Card description |
| `status` | String | `null` | `'active'`, `'inactive'`, `'error'`, `'warning'` |
| `statusLabel` | String | `''` | Override status display text |
| `loading` | Boolean | `false` | Loading state |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `action` | `actionName` | Action button clicked |

## Slots

| Slot | Description |
|------|-------------|
| `default` | Card content |
| `#actions` | Action buttons |
| `#status` | Custom status indicator |

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
