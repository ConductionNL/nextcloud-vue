---
sidebar_position: 6
---

import Playground from '@site/src/components/Playground'
import GeneratedRef from './_generated/CnCellRenderer.md'

# CnCellRenderer

Type-aware cell renderer for schema-driven tables. Automatically formats values based on the schema property type.

**Wraps**: CnStatusBadge, CheckBold icon

## Try it

<Playground component="CnCellRenderer" />

![CnCellRenderer showing various cell types in a data table](/img/screenshots/cn-cell-renderer.png)

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | any | `null` | Cell value |
| `property` | Object | `\{\}` | Schema property definition |
| `truncate` | Number | `100` | Max string length before truncation |

## Type Rendering

| Property Type | Rendering |
|--------------|-----------|
| Boolean | CheckBold icon (green/hidden) |
| Enum | CnStatusBadge pill |
| Array | Comma-joined values or item count |
| Date/datetime | Formatted date string |
| UUID | Monospace styling |
| Number | Tabular-nums CSS |
| String (long) | Truncated with tooltip showing full value |

## Usage

CnCellRenderer is used internally by CnDataTable. You typically don't use it directly unless building a custom table:

```vue
<CnCellRenderer
  :value="row.status"
  :property="schema.properties.status" />
```

## Reference (auto-generated)

The tables below are generated from the SFC source via `vue-docgen-cli`. They reflect what's actually in [`CnCellRenderer.vue`](https://github.com/ConductionNL/nextcloud-vue/blob/beta/src/components/CnCellRenderer/CnCellRenderer.vue) and update automatically whenever the component changes.

<GeneratedRef />
