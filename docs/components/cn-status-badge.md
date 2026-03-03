---
sidebar_position: 9
---

# CnStatusBadge

Color-coded pill badge for status, priority, or category display. Supports automatic variant resolution via colorMap.

## Props

![CnStatusBadge showing colored status indicators](/img/screenshots/cn-cell-renderer.png)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | String | `''` | Display text |
| `variant` | String | `'default'` | `'default'`, `'primary'`, `'success'`, `'warning'`, `'error'`, `'info'` |
| `size` | String | `'medium'` | `'small'` or `'medium'` |
| `colorMap` | Object | `null` | Map label values to variants (case-insensitive) |

## Slots

| Slot | Description |
|------|-------------|
| default | Custom label content |

## Usage

```vue
<!-- Manual variant -->
<CnStatusBadge label="Active" variant="success" />

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
