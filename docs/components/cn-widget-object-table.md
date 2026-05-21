# CnWidgetObjectTable

`CnWidgetObjectTable` is the built-in v2 widget that exposes
[CnDataTable](./cn-data-table.md) to the manifest layer. It's a
transparent pass-through — all props and listeners are forwarded.

## Import

```js
import { CnWidgetObjectTable } from '@conduction/nextcloud-vue'
```

## Manifest usage

Referenced via `widgetKey: "object-table"` in a v2 manifest page's
`widgets[]` array:

```json
{
  "id": "sources-table",
  "slot": "body",
  "widgetKey": "object-table",
  "gridWidth": 12,
  "props": {
    "register": "openconnector",
    "schema": "source",
    "columns": ["name", "status", "lastSync"]
  }
}
```

When `CnPageRenderer` mounts the page, `CnWidgetGrid` resolves the
`object-table` key against `BUILT_IN_WIDGETS`, instantiates this
wrapper, and passes the `props` map through to `CnDataTable`.

## Props

All props are forwarded to `CnDataTable` — see the
[CnDataTable docs](./cn-data-table.md) for the full surface. The
commonly used ones in manifest widgets are:

| Prop | Type | Description |
| --- | --- | --- |
| `register` | `String` | Register slug for self-fetch mode. |
| `schema` | `String` | Schema slug for self-fetch mode. |
| `columns` | `Array` | Explicit column definitions (overrides schema-derived). |
| `filter` | `Object` | Server-side filter map. |
| `objects` | `Array` | Pre-fetched objects (disables self-fetch). |

## Events

All listeners are forwarded to `CnDataTable`. See its docs for the full
event surface (`@row-click`, `@sort`, etc.).

## Spec

- REQ-MVR-006 (manifest-v2-renderer) — built-in widget: object-table
