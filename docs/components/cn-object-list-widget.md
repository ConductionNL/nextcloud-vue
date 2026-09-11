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
  "extend": ["informatieobject"],
  "columns": [{ "key": "title", "label": "Title" }],
  "rowActions": [
    { "label": "Versions", "icon": "History", "type": "open-modal", "target": "VersionHistoryPanel" }
  ],
  "dropZone": { "type": "open-modal", "target": "DocumentMetadataDialog", "label": "Drop documents here" },
  "emptyText": "No leads yet",
  "viewAllRoute": "leads-index",
  "viewAllQuery": { "customer": "@objectId" }
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `object` | `{}` | The list config blob (`register`, `schema`, `filter`, `sort`, `limit`, `extend`, `columns`, `rowActions`, `dropZone`, `rowRoute`, `prompt`, `emptyText`, `viewAllRoute`, `viewAllQuery`). |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `row-click` | `object` | The clicked object row. |
| `view-all` | `{ total: number }` | The "View all (N)" footer was clicked. |
| `files-dropped` | `File[]` | Files were dropped on a widget declaring `dropZone`. |

## Notes

- `columns[]` maps object property keys to table headers; each row links through to the object when a route is resolvable.
- `limit` is a **fetch cap** (default 25), not a render promise — the visible row count fits the host cell.
- An empty collection renders a compact one-line empty state (`emptyText`), never a full-height void.
- `viewAllRoute` names a page id; `viewAllQuery` values are token-resolved (`@objectId` / `@object.<field>` / `@workspace.<key>`) so the target index opens pre-scoped.
- The `table` registry alias uses the same renderer.

### Reading several fields off one reference: `extend`

A column key may be dotted (`informatieobject.title`), and `CnDataTable` reads
it as a path into the row. A reference property holds a **uuid string** at that
key, so without asking the server to inline the referenced object the path
resolves to nothing — and six columns off one reference produce six blank or
identical cells, with nothing logged and nothing failing.

`content.extend` is the OpenRegister `_extend[]` list sent with the fetch. With
`"extend": ["informatieobject"]` the referenced object rides the row and every
dotted column resolves.

Use `extend` when you need **several fields** off the same reference. For a
single label, the cheaper answer is the built-in `fkResolve` cell widget
(`widget: "fkResolve"`, `widgetProps: { register, schema, labelField }`), which
resolves one label per column through the shared object store.

### Row actions

`content.rowActions[]` takes entries in the unified manifest action shape
(`handler`, `open-modal`, `open-page`, `navigate`, …) and renders them per row
through [`CnRowActions`](./cn-row-actions.md). A `handler` action receives the
row as its final argument. `destructive: true` colours the entry as a
destructive one. Declaring no `rowActions` leaves the table exactly as it was —
the trailing actions column is only painted when the slot is supplied.

Actions carry **intent, not authority**: OpenRegister RBAC decides what a write
may actually do.

### Drop zone

`content.dropZone` is one action of that same shape, dispatched when files are
dropped on the widget. While a file drag is over the widget an overlay is
painted (`dropZone.label` overrides its copy).

The dropped `File[]` reaches the action two ways, because the action types take
input differently: a `handler` action gets the array as its final argument, and
an `open-modal` action gets it as `props.files`. The widget also emits
`files-dropped` for a host that would rather handle the drop itself.

Nothing is uploaded here. The widget reads no file content and calls no write
endpoint — whoever receives the files decides where they are stored, the same
split the form file field keeps. A drag carrying anything other than files is
ignored and falls through to the browser.

### Create affordance

The widget renders a **"+ Add"** footer button (and the detail-page card's
Actions menu carries the same **Add** entry, both calling the public
`openCreate()`). The dialog is a `CnFormDialog` over the target schema; the
list's resolved scalar filter values are merged in as defaults, so an
FK-scoped list creates pre-linked children (a task added on a case detail
already carries the case). Opt out with `content.allowCreate: false`; rename
with `content.addLabel`. Emits `created` with the sent payload.
