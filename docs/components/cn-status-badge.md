---
sidebar_position: 9
---

import Playground from '@site/src/components/Playground'
import GeneratedRef from './_generated/CnStatusBadge.md'

# CnStatusBadge

Color-coded pill badge for status, priority, or category display. Supports automatic variant resolution via colorMap.

## Try it

<Playground component="CnStatusBadge" />

## Props

![CnStatusBadge showing colored status indicators](/img/screenshots/cn-cell-renderer.png)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | String | `''` | Display text |
| `variant` | String | `'default'` | `'default'`, `'primary'`, `'success'`, `'warning'`, `'error'`, `'info'` |
| `size` | String | `'medium'` | `'small'` or `'medium'` |
| `solid` | Boolean | `false` | Use solid background with white text instead of light background with colored text |
| `colorMap` | Object | `null` | Map label values to variants (case-insensitive) |
| `colorKey` | String | `''` | Look this up in `colorMap` instead of the label. Use it when the label is translated but the map is keyed on the raw value (e.g. a schema enum code) — otherwise a translated label matches nothing and the badge falls back to `variant`. |

## Slots

| Slot | Description |
|------|-------------|
| default | Custom label content |
| `#icon` | Icon element displayed before the label text |

## Usage

```vue
<!-- Manual variant -->
<CnStatusBadge label="Active" variant="success" />

<!-- Solid variant — for use on colored backgrounds -->
<CnStatusBadge label="Active" variant="success" :solid="true" />

<!-- Auto-resolved from colorMap -->
<CnStatusBadge
  :label="contact.status"
  :colorMap="{
    active: 'success',
    inactive: 'error',
    lead: 'warning',
    prospect: 'info',
  }" />
```

## Reference (auto-generated)

The tables below are generated from the SFC source via `vue-docgen-cli`. They reflect what's actually in [`CnStatusBadge.vue`](https://github.com/ConductionNL/nextcloud-vue/blob/beta/src/components/CnStatusBadge/CnStatusBadge.vue) and update automatically whenever the component changes.

<GeneratedRef />
