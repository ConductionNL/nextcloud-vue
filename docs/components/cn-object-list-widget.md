# CnObjectListWidget

Object list / table widget. Fetches a page of OpenRegister objects (register + schema + filter + sort + limit) at runtime and renders them as a compact column table. Registered under the `object-list` type (and aliased as `table`) and configured by [`CnObjectListWidgetForm`](./cn-object-list-widget-form.md).

On detail pages the widget is **cell-budgeted** (ADR-062): it renders as many rows as fit its grid cell, then a "View all (N)" footer instead of a nested scrollbar. On surfaces without a fixed-height cell (dashboards) every fetched row renders, as before.

## Content shape

```json
{
  "register": "pipelinq",
  "schema": "lead",
  "filter": {},
  "sort": { "field": "created", "dir": "desc" },
  "limit": 25,
  "columns": [{ "key": "title", "label": "Title" }],
  "emptyText": "No leads yet",
  "viewAllRoute": "leads-index",
  "viewAllQuery": { "customer": "@objectId" }
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `object` | `{}` | The list config blob (`register`, `schema`, `filter`, `sort`, `limit`, `columns`, `rowRoute`, `prompt`, `emptyText`, `viewAllRoute`, `viewAllQuery`). |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `row-click` | `object` | The clicked object row. |
| `view-all` | `{ total: number }` | The "View all (N)" footer was clicked. |

## Notes

- `columns[]` maps object property keys to table headers; each row links through to the object when a route is resolvable.
- `limit` is a **fetch cap** (default 25), not a render promise — the visible row count fits the host cell.
- An empty collection renders a compact one-line empty state (`emptyText`), never a full-height void.
- `viewAllRoute` names a page id; `viewAllQuery` values are token-resolved (`@objectId` / `@object.<field>` / `@workspace.<key>`) so the target index opens pre-scoped.
- The `table` registry alias uses the same renderer.

### Create affordance

The widget renders a **"+ Add"** footer button (and the detail-page card's
Actions menu carries the same **Add** entry, both calling the public
`openCreate()`). The dialog is a `CnFormDialog` over the target schema; the
list's resolved scalar filter values are merged in as defaults, so an
FK-scoped list creates pre-linked children (a task added on a case detail
already carries the case). Opt out with `content.allowCreate: false`; rename
with `content.addLabel`. Emits `created` with the sent payload.
