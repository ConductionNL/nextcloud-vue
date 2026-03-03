---
sidebar_position: 23
---

# CnSettingsCard

Collapsible card for organizing settings into sections. Used in admin settings pages.

## Props

![CnSettingsCard showing lead sources configuration](/img/screenshots/cn-settings-card.png)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | String | `''` | Card title |
| `description` | String | `''` | Card description |
| `collapsed` | Boolean | `false` | Initial collapsed state |
| `collapsible` | Boolean | `true` | Allow collapsing |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `toggle` | `isCollapsed` | Collapse state changed |

## Slots

| Slot | Description |
|------|-------------|
| `default` | Card content |
| `#actions` | Header action buttons |

## Usage

```vue
<CnSettingsCard title="General Settings" description="Basic configuration options">
  <NcTextField label="App Name" v-model="appName" />
  <NcSelect label="Default Language" v-model="language" :options="languages" />
</CnSettingsCard>
```
