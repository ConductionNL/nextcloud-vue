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
| `formatter` | String | `null` | Optional cell-formatter id (e.g. `currency`, `automationTrigger`). When set and resolvable in the injected `cnFormatters` registry (provided by `CnAppRoot`), the cell renders `cnFormatters[formatter](value, row, property)` as text — overriding the type-aware rendering. Unknown id / missing registry / a throwing formatter all fall back. See [migrating-to-manifest → Column formatters](../migrating-to-manifest.md#column-formatters). |
| `row` | Object | `\{\}` | The full row object — passed so a formatter can be a function of the whole record (e.g. "days since `@self.updated`"), not just this one cell value. |
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
