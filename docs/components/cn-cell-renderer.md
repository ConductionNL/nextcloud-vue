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
| `formatter` | String | `null` | Optional cell-formatter id. When set and resolvable in the injected `cnFormatters` registry (provided by `CnAppRoot`), the cell renders `cnFormatters[formatter](value, row, property, formatterOptions)` as text — overriding the type-aware rendering. **Built-in formatters** (registered by `CnAppRoot` by default): `"date"` (`Intl.DateTimeFormat` `dateStyle:"medium"`), `"datetime"` (date + `timeStyle:"short"`), `"relative-time"` (`Intl.RelativeTimeFormat`, "3 days ago"), `"daysUntil"` (future-oriented deadline phrasing: "N days remaining" / "Due today" / "N days overdue" — plural-aware via `translatePlural`), `"daysSince"` (elapsed-day phrasing: "N days ago" / "Today"), `"currency"` (`Intl.NumberFormat` currency, EUR default; `formatterOptions.currency` / `.decimals` override), `"conditionalPhrase"` (sign/zero-based phrase selection over a numeric field — `formatterOptions { negative, zero, positive }` pre-translated phrases with `{n}` replaced by the absolute value; generalizes `daysUntil`), `"count"` (summarises a collection-valued cell as an entry count — array entries or object keys, a scalar counting as 1 — with `formatterOptions { singular, plural, zero }` pre-translated phrases and `{n}` substituted; without phrases, the bare count). All built-ins are safe against null/empty/non-parseable input (return `''` / original value, no throw). Consumer-registered formatters with the same id win. Unknown id / missing registry / a throwing formatter all fall back. See [migrating-to-manifest → Column formatters](../migrating-to-manifest.md#column-formatters). |
| `formatterOptions` | Object | `null` | Declarative options map passed as the formatter's fourth argument (e.g. `{ currency: 'USD' }` for `"currency"`, or the `{ negative, zero, positive }` phrases for `"conditionalPhrase"`). Declared on a table column as `formatterOptions`. Additive: three-argument formatters simply ignore it. |
| `widget` | String | `null` | Optional cell-widget id. When it resolves in the injected `cnCellWidgets` registry (provided by `CnAppRoot`), the cell renders that component with `{ value, row, property, formatted, ...widgetProps }`. **Built-ins** (resolved without a registry entry): `"badge"` → `CnStatusBadge`; `"fkResolve"` → `CnFkResolveCell` (resolves a reference uuid — or an array of them — to the related object's display label via the shared object store with per-schema caching; config `widgetProps { register, schema, labelField }`; unresolvable ids degrade to the raw id); `"link"` → a router-link (when `widgetProps.route` is set, a manifest page id) / external `<a target="_blank">` (when `widgetProps.href` is set, with `{key}` placeholder substitution from the row) / plain text + once-per-session `console.warn` when neither resolves (set `widgetProps.fallback:"silent"` to suppress the warn). Takes precedence over `formatter` / the type-aware rendering (the widget gets the formatter-shaped value as `formatted` when `formatter` is also set). Consumer-registered widgets with the same id override the built-ins. Unknown id falls back. See [migrating-to-manifest → Column widgets](../migrating-to-manifest.md#column-widgets). |
| `widgetProps` | Object | `\{\}` | Extra props spread onto the resolved cell-widget component. Recognised by the built-ins: `variant` (badge), `colorMap` (badge — a `{ value: variant }` map, e.g. `{ placed: 'primary', delivered: 'success' }`, resolved per label by `CnStatusBadge`; falls back to `variant`), `register` + `schema` + `labelField` (fkResolve), `route` + `params` (link router-link), `href` (link external anchor), `fallback:"silent"` (link no-warn). |
| `format` | Object | `null` | Optional declarative cell-format — a no-code alternative to a registry `formatter`. Recognised `style` values: `"currency"` (Intl currency, e.g. `€ 1.234,56`; honours `currency` ISO code default `"EUR"` and `decimals` default 2), `"number"` / `"percent"` (localized number, percent appends `%`; `decimals` default 0), `"duration"` (a seconds value rendered compact like `1u 23m` / `45m 10s` / `12s`; pass `unit: "milliseconds"` / `"minutes"` / `"hours"` when the raw value is not seconds — a sub-second milliseconds value renders as `245ms` rather than flooring to `0s`), and `"swatch"` (a colour dot read from the sibling row field named by `colorField`, default `"color"`, beside the cell text). `prefix` / `suffix` wrap the numeric/duration styles. Resolved AFTER `formatter` / `widget` (those win), BEFORE the type-aware default. |
| `row` | Object | `\{\}` | The full row object — passed so a formatter can be a function of the whole record (e.g. "days since `@self.updated`"), not just this one cell value. Also the source of a `format:"swatch"` cell's colour field. |
| `rowKey` | String | `'id'` | Row identifier field — used by the built-in `widget:"link"` when `widgetProps.params` is not declared (default param map is `{ id: row[rowKey] }`). |
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
