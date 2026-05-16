---
sidebar_position: 23
---

import Playground from '@site/src/components/Playground'
import GeneratedRef from './_generated/CnSettingsCard.md'

# CnSettingsCard

Collapsible card for organizing settings into sections. Used in admin settings pages.

## Try it

<Playground component="CnSettingsCard" />

## Props

![CnSettingsCard showing lead sources configuration](/img/screenshots/cn-settings-card.png)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | String | `''` | Card title |
| `icon` | String | `''` | Emoji or text icon displayed before the title |
| `collapsible` | Boolean | `false` | Allow collapsing the card |
| `defaultCollapsed` | Boolean | `false` | Whether the card starts in a collapsed state (only relevant when `collapsible` is `true`) |

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

## Reference (auto-generated)

The tables below are generated from the SFC source via `vue-docgen-cli`. They reflect what's actually in [`CnSettingsCard.vue`](https://github.com/ConductionNL/nextcloud-vue/blob/beta/src/components/CnSettingsCard/CnSettingsCard.vue) and update automatically whenever the component changes.

<GeneratedRef />
