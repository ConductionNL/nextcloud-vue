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
| `formatter` | String | `null` | Optional cell-formatter id. When set and resolvable in the injected `cnFormatters` registry (provided by `CnAppRoot`), the cell renders `cnFormatters[formatter](value, row, property, formatterOptions)` as text — overriding the type-aware rendering. **Built-in formatters** (registered by `CnAppRoot` by default): `"date"` (`Intl.DateTimeFormat` `dateStyle:"medium"`), `"datetime"` (date + `timeStyle:"short"`), `"relative-time"` (`Intl.RelativeTimeFormat`, "3 days ago"), `"daysUntil"` (future-oriented deadline phrasing: "N days remaining" / "Due today" / "N days overdue" — plural-aware via `translatePlural`), `"daysSince"` (elapsed-day phrasing: "N days ago" / "Today"), `"currency"` (`Intl.NumberFormat` currency, EUR default; `formatterOptions.currency` / `.decimals` override), `"conditionalPhrase"` (sign/zero-based phrase selection over a numeric field — `formatterOptions { negative, zero, positive }` pre-translated phrases with `{n}` replaced by the absolute value; generalizes `daysUntil`), `"count"` (summarises a collection-valued cell as an entry count — array entries, object keys, a collection persisted as a JSON string, or a present scalar counting as 1, with every empty value including `0` / `false` taking the zero phrase — with `formatterOptions { singular, plural, zero }` pre-translated phrases and `{n}` substituted; without phrases, the bare count), `"connectionStatus"` (a connection registry status: `configured`, `limited`, `unconfigured`, `simulated`, `disabled`, `unavailable` and `error` render as Configured, Limited, Not configured, Simulated, Switched off, Not available and Error, and any other value passes through unchanged), `"connectionSettingsLabel"` ("Open settings" when the row's `settingsUrl` is a non-empty string, otherwise empty). All built-ins are safe against null/empty/non-parseable input (return `''` / original value, no throw). Consumer-registered formatters with the same id win. Unknown id / missing registry / a throwing formatter all fall back. See [migrating-to-manifest → Column formatters](../migrating-to-manifest.md#column-formatters). |
| `formatterOptions` | Object | `null` | Declarative options map passed as the formatter's fourth argument (e.g. `{ currency: 'USD' }` for `"currency"`, or the `{ negative, zero, positive }` phrases for `"conditionalPhrase"`). Declared on a table column as `formatterOptions`. Additive: three-argument formatters simply ignore it. |
| `widget` | String | `null` | Optional cell-widget id. When it resolves in the injected `cnCellWidgets` registry (provided by `CnAppRoot`), the cell renders that component with `{ value, row, property, formatted, ...widgetProps }`. **Built-ins** (resolved without a registry entry): `"badge"` → `CnStatusBadge`; `"fkResolve"` → `CnFkResolveCell` (resolves a reference uuid — or an array of them — to the related object's display label via the shared object store with per-schema caching; config `widgetProps { register, schema, labelField }`; unresolvable ids degrade to the raw id); `"refLabel"` → the label of a referenced object, already resolved in a batch (`widgetProps { labels: { id: label\|null }, route? }`; an id still pending shows `…`, one that did not resolve shows the id in mono; with `route` each label links to that page for the referenced id; `CnIndexPage` sets it for a column with `labelField`); `"link"` → a router-link (when `widgetProps.route` is set, a manifest page id, or when `widgetProps.routeField` + `widgetProps.routeMap` pick the page per row from a sibling field, with `route` as the fallback) / external `<a target="_blank">` (when `widgetProps.href` is set, with `{key}` placeholder substitution from the row) / plain text + once-per-session `console.warn` when neither resolves (set `widgetProps.fallback:"silent"` to suppress the warn). Takes precedence over `formatter` / the type-aware rendering (the widget gets the formatter-shaped value as `formatted` when `formatter` is also set). Consumer-registered widgets with the same id override the built-ins. Unknown id falls back. See [migrating-to-manifest → Column widgets](../migrating-to-manifest.md#column-widgets). |
| `widgetProps` | Object | `\{\}` | Extra props spread onto the resolved cell-widget component. Recognised by the built-ins: `variant` (badge), `colorMap` (badge — a `{ value: variant }` map, e.g. `{ placed: 'primary', delivered: 'success' }`, resolved per label by `CnStatusBadge`; falls back to `variant`), `register` + `schema` + `labelField` (fkResolve), `labels` + `route` (refLabel), `route` + `params` (link router-link), `href` (link external anchor), `fallback:"silent"` (link no-warn). |
| `format` | Object | `null` | Optional declarative cell-format — a no-code alternative to a registry `formatter`. Recognised `style` values: `"currency"` (Intl currency, e.g. `€ 1.234,56`; honours `currency` ISO code default `"EUR"` and `decimals` default 2), `"number"` / `"percent"` (localized number, percent appends `%`; `decimals` default 0), `"duration"` (a seconds value rendered compact like `1u 23m` / `45m 10s` / `12s`; pass `unit: "milliseconds"` / `"minutes"` / `"hours"` when the raw value is not seconds — a sub-second milliseconds value renders as `245ms` rather than flooring to `0s`), and `"swatch"` (a colour dot read from the sibling row field named by `colorField`, default `"color"`, beside the cell text). `prefix` / `suffix` wrap the numeric/duration styles. Resolved AFTER `formatter` / `widget` (those win), BEFORE the type-aware default. |
| `row` | Object | `\{\}` | The full row object — passed so a formatter can be a function of the whole record (e.g. "days since `@self.updated`"), not just this one cell value. Also the source of a `format:"swatch"` cell's colour field. |
| `rowKey` | String | `'id'` | Row identifier field — used by the built-in `widget:"link"` when `widgetProps.params` is not declared (default param map is `{ id: row[rowKey] }`). |
| `truncate` | Number | `100` | Max string length before truncation |

## Avatar and date cells

Two more built-in cell widgets, both set with `widget` on a column.

**`"avatar"`** shows a person: a picture and the name beside it.

```json
{ "key": "handlerName", "label": "Handler", "widget": "avatar", "widgetProps": { "userField": "handler" } }
```

| `widgetProps` key | Description |
|-------------------|-------------|
| `userField` | Row field that holds the Nextcloud user id. The cell then shows that user's avatar. |

The **`"date"`** widget takes two more `widgetProps` keys: `showTime: true` adds the time of day ("5 Oct 2026, 08:30") and `timeOnly: true` shows the time alone ("08:30"), for a timetable row. The default is the date alone.

The monospace uuid style (`format: "uuid"`) applies only when the value is a uuid and nothing resolves it: a reference a formatter or a widget resolved to its name renders in the normal text style.
| `user` | `true` when the cell value itself is the user id. |
| `nameField` | Row field that holds the name to show. Defaults to the cell value. |
| `size` | Picture size in pixels. Default 24. |

Without a user id the cell shows the initials of the name, such as "PV" for "Pieter de Vries". The picture is decoration and hidden from screen readers. The name is the text.

**`"date"`** shows a date whose colour follows rules on how far away it is.

```json
{
  "key": "deadline",
  "label": "Deadline",
  "widget": "date",
  "widgetProps": {
    "variantWhen": [
      { "op": "lt", "value": 0, "variant": "error" },
      { "op": "lte", "value": 5, "variant": "warning" }
    ]
  }
}
```

Each rule compares the number of days until the date: `0` is today, a negative number is overdue. The first rule that matches wins. `variant` is `success`, `warning`, `error` or `default`. A date that matched a rule is also set in a heavier weight, so the signal does not rest on colour alone. The same rules are available as [`resolveDateVariant`](../utilities/resolve-date-variant.md), for a board card or any other place a deadline shows.

## Group cells

A Nextcloud group id is not something a person should read. A column whose
schema property is marked as a group shows the group's display name instead:

```json
{ "assignedGroup": { "type": "string", "referenceType": "nextcloud-group" } }
```

`format: "nc-group"` works the same, and so does an array whose `items` is
marked (the names are joined with a comma). A column without such a property
can ask for it with `"widget": "group"`.

Each id is looked up once per page and cached, so a table of fifty cases in
three teams makes three requests, and every cell with the same id updates at
once. While the name loads, and when the group cannot be found, the cell shows
the id. A column `formatter` or a consumer-registered cell widget still wins.
The lookup is [`loadGroupDisplayName`](../utilities/group-display-name.md).

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
