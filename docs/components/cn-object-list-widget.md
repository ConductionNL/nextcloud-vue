# CnObjectListWidget

Object list / table widget. Fetches a page of OpenRegister objects (register + schema + filter + sort + limit) at runtime and renders them as a compact column table. Registered under the `object-list` type (and aliased as `table`) and configured by [`CnObjectListWidgetForm`](./cn-object-list-widget-form.md).

## Content shape

```json
{
  "register": "pipelinq",
  "schema": "lead",
  "filter": {},
  "sort": { "field": "created", "dir": "desc" },
  "limit": 5,
  "columns": [{ "key": "title", "label": "Title" }]
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `object` | `{}` | The list config blob (`register`, `schema`, `filter`, `sort`, `limit`, `columns`). |

## Notes

- `columns[]` maps object property keys to table headers; each row links through to the object when a route is resolvable.
- The `table` registry alias uses the same renderer with a larger default `limit`.
