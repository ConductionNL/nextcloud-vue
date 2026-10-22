# CnObjectListWidget

Object list / table widget. Fetches a page of OpenRegister objects (register + schema + filter + sort + limit) at runtime and renders them as a compact column table. Registered under the `object-list` type (and aliased as `table`) and configured by [`CnObjectListWidgetForm`](./cn-object-list-widget-form.md).

On detail pages the widget is **cell-budgeted** (ADR-062): it renders as many rows as fit its grid cell, then a "View all (N)" footer instead of a nested scrollbar. On surfaces without a fixed-height cell (dashboards) every fetched row renders, as before. A list that shares its cell with other content opts out with `"fit": false`; see [Stacked lists](#stacked-lists-fit-false) below.

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
  "viewAllQuery": { "customer": "@objectId" },
  "fit": true
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `object` | `{}` | The list config blob (`register`, `schema`, `filter`, `sort`, `limit`, `extend`, `columns`, `rowActions`, `dropZone`, `rowRoute`, `prompt`, `emptyText`, `viewAllRoute`, `viewAllQuery`, `fit`). |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `row-click` | `(object, event)` | The clicked object row and the native click event. With `rowRoute`, a ctrl/cmd/shift click opens the row in a new tab. A middle click emits `row-aux-click` instead. |
| `row-aux-click` | `(object, event)` | The middle-clicked object row and the native auxclick event. With `rowRoute`, the row opens in a new tab. |
| `view-all` | `{ total: number }` | The "View all (N)" footer was clicked. The footer is a real link to `viewAllRoute`, so it can be opened in a new tab. |
| `files-dropped` | `File[]` | Files were dropped on a widget declaring `dropZone`. |

## Notes

- `columns[]` maps object property keys to table headers; each row links through to the object when a route is resolvable.
- `limit` is a **fetch cap** (default 25), not a render promise — the visible row count fits the host cell, unless `fit` is `false`. A list inside a tab panel does not own the cell, so it renders every fetched row, as on a dashboard; `fit: true` brings the fit back there.
- An empty collection renders a compact one-line empty state (`emptyText`), never a full-height void.
- `viewAllRoute` names a page id; `viewAllQuery` values are token-resolved (`@objectId` / `@object.<field>` / `@workspace.<key>`) so the target index opens pre-scoped.
- The `table` registry alias uses the same renderer.
- `filter` values may use the filter tokens. `@myGroups` is the ids of the groups the reader is in, sent as an IN filter (`assignedGroup[]=a&assignedGroup[]=b`), so `{ "assignedGroup": "@myGroups", "assignee": "IS NULL" }` is the unclaimed work of the reader's teams. While the groups load, and for a reader in no group, the list does not fetch and shows its `prompt`: an empty IN list would match every row. Set `content.prompt` to say what that means for your list.

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

### Stacked lists: `fit: false`

The cell budget measures from where the **table starts** to the bottom of the
grid cell. That is right for a list that owns its cell. It is wrong for a list
stacked below other content in the same cell, such as the second or third
section of a tabbed panel: the table starts near the bottom, the budget floors
to one row, and the rest are clipped.

It fails quietly. On one live case page an Objects table began 584px down a
696px cell, showed one of the two objects the server had returned, and no
"+1 more" footer was visible to say a row had been hidden.

`"fit": false` renders every fetched row and lets the container scroll. Only an
explicit `false` opts out, so a manifest that never sets the key keeps the
ADR-062 behaviour unchanged. `limit` still caps the fetch and the pager still
pages, so a long collection stays bounded.

A container that stacks several widgets in one cell should set it on each child
rather than leaving it to each manifest author: the next list moved below
another one is the one that forgets.

### Footer links: `footerLinks`

`footerLinks` ends the list with a row of links, each with an optional muted note (DqZaakGerelateerd):

```json
"footerLinks": [
  { "label": "All cases on this object", "route": "Cases", "query": { "object": "@objectId" } },
  { "label": "Manage object types", "href": "/index.php/settings/admin/dossiq", "note": "(administrators only)", "group": "admin" }
]
```

A `route` link names a page id; its `query` values are token-resolved as `viewAllQuery`'s are, and it follows the router (a modified click opens a new tab). An `href` link is a plain link. Labels and notes go through the host translate. A link with `group` shows only to members of that group.

### Row actions

`content.rowActions[]` takes entries in the unified manifest action shape
(`handler`, `open-modal`, `open-page`, `navigate`, …) and renders them per row
through [`CnRowActions`](./cn-row-actions.md). A `handler` action receives the
row as its final argument. `destructive: true` colours the entry as a
destructive one. Declaring no `rowActions` leaves the table exactly as it was —
the trailing actions column is only painted when the slot is supplied.

Actions carry **intent, not authority**: OpenRegister RBAC decides what a write
may actually do.

### Row tokens

A row action reads the row it runs on: `@row.<field>` and `{field}` (dot paths) in its `target`, `url`, `payload`, `params`, `props`, `query` or `filename` fill from the row; `{objectId}` and the page's `@`-tokens still read the page. A `navigate` action whose target holds a row token is a link per row:

```json
"rowActions": [
  { "label": "All cases on this object", "type": "navigate", "target": "/cases?object=@row.id" }
]
```

A value filled into a `target` or `url` is URL-encoded (an object URL holds `?` and `&`). A `navigate` action can also name a page by `route` with a `query`; the query's row tokens fill raw, because the router encodes them:

```json
{ "label": "All cases on this object", "type": "navigate", "route": "Cases", "query": { "_related[caseObject][case][objectUrl]": "{objectUrl}" } }
```

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

### Create defaults from the page

`createDefaults` values resolve the same tokens as `filter`: `{ "caseType": "@objectId" }` starts a new row on the page's object. When the server refuses the create, the dialog shows the server's own message.

### Edit in place: `editable`

`editable: true` gives every row an Edit action that opens the list's own form (the one Add opens, with `formFieldOverrides`, `formIncludeFields` and the rest) filled with the row. The save is a PATCH of the keys the form changed, so the keys it does not show keep their stored value, and nothing is written when nothing changed. A refusal shows the server's message in the dialog. The widget emits `updated` with `{ id, changes }`.

`deletable: true` adds a Delete row action for the list's own schema. The toast offers Undo; a refusal toasts the server's message.

A declared `object-op` patch row action writes only its `values` too, through the store's `patchObject`.

### Reorder: `reorder`

`reorder: { "field": "order" }` lists the rows in the order a field of their own records holds, as the statuses of a case type. The reader drags a row to another place, or uses its Move up and Move down actions. The rows are renumbered from 1 (from the page's first place on a later page), and only that field is written, as a PATCH, and only on the rows whose number changed, so every other key of a row keeps its value. The new place is read out ("Intake moved to place 2 of 6"). When the server refuses (a case type must keep a final status), its message is read out and the list is read again. A new row starts last (`order` = list length + 1). A grouped list does not reorder.

### Create affordance

The widget renders a **"+ Add"** footer button (and the detail-page card's
Actions menu carries the same **Add** entry, both calling the public
`openCreate()`). The dialog is a `CnFormDialog` over the target schema; the
list's resolved scalar filter values are merged in as defaults, so an
FK-scoped list creates pre-linked children (a task added on a case detail
already carries the case). Opt out with `content.allowCreate: false`; rename
with `content.addLabel`. Emits `created` with the sent payload.

The form opens in the list's context: it receives the list's `register` (so a `$ref` field is a picker, not a text box) and `initialData` derived from the resolved filter. Only scalar filter keys the schema declares are used, after `@objectId`, `@me` and `@workspace.*` tokens resolve; operator keys such as `deadline[lt]` and unknown keys are dropped. Those prefilled parent fields render read-only with their label unless `content.lockFilterFields` is `false` (default `true`). `content.createDefaults` (an object of schema keys) merges over the filter-derived data for values a filter cannot express, for example `{ "direction": "outbound" }`; defaults are never locked.

#### A create that goes through the app: `createAction`

When a record has to be created through the app rather than straight to the
object API (to validate it, or to derive it from the record on the page),
declare `content.createAction`: one action in the `rowActions` shape. Every
Add, the footer button, the empty state's button and the host card's menu
entry, then runs that action instead of opening the form, labelled with its
`label`.

Its `visibleWhen` is evaluated against the record of the page the list sits
on. While it fails, every Add is hidden. While the record is still loading,
the Add stays hidden too, so it does not appear and then vanish.
`hiddenNote` says why in the Add's place: a string, or a list of
`{ when, text }` where the first entry whose `when` holds is shown. Both go
through the app's translate.

```json
"createAction": {
  "type": "open-modal",
  "target": "SubCaseCreateModal",
  "label": "Create sub-case",
  "props": { "parentCase": "@objectId" },
  "visibleWhen": { "all": [
    { "field": "endDate", "op": "empty" },
    { "field": "parentCase", "op": "empty" }
  ] },
  "hiddenNote": [
    { "when": { "field": "parentCase", "op": "notEmpty" }, "text": "Sub-cases cannot themselves have sub-cases." },
    { "when": { "field": "endDate", "op": "notEmpty" }, "text": "This case is closed; sub-cases can no longer be added." }
  ]
}
```

The action's own work, including refreshing the list after it saved, is the
action's: a modal emits the page refresh (`cn:page:refresh`) when it is done.

#### A roll-up line: `summary`

`content.summary` is one line under the rows. `{total}` is the number of
loaded rows, and each key of `counts` is the number of loaded rows its
condition (the `visibleWhen` shape) holds for. The text goes through the
app's translate before the numbers are filled in, so a catalogue entry keeps
its placeholders. Nothing is drawn over an empty list.

```json
"summary": {
  "text": "({completed}/{total} completed)",
  "counts": { "completed": { "field": "endDate", "op": "notEmpty" } }
}
```

`content.hideHeader: true` drops the table's column header row (CnDataTable's `hideHeader`), for a short list that reads as rows rather than as a table.

The table never scrolls sideways inside its card. When its columns are wider than the card it is squeezed in two steps, each taken only while it still overflows: first the fit (one column takes what is left and is cut with an ellipsis, the others keep their content on one line; `grow: true` on a column picks which one), then a fixed layout (every column an equal share, text wrapped). `content.fitWidth: true` forces the first step on, `false` keeps the table's own layout (and its scrollbar).

## Write feedback

A row action of type `object-op` with `op: "delete"` toasts "Deleted \{title\}" with an Undo for ten seconds; Undo restores the row from the OpenRegister trash (`POST /apps/openregister/api/deleted/{id}/restore`) and refreshes the list, and a failed delete toasts an error. A create through the widget shows one toast, the create dialog's, never a second from the widget. `feedback: false` in the widget `content` suppresses the delete toasts.

## Rows that point at more than one schema

A relationship points at a contact or at an organisation. Three keys handle a list whose rows do that:

| Key | Meaning |
|-----|---------|
| `rowRouteField` + `rowRouteMap` | The row opens the page its field names: `{ "toType": ... }` with `{ "client": "ClientDetail", "contact": "ContactDetail" }`. Falls back to `rowRoute`. |
| `rowRouteIdField` | The row field whose value is the id the page opens (`toContact`), instead of the row's own id. |
| `groupOrder` | With `groupBy`: the group keys listed first, in this order (`["Organisatie", "Professioneel", "Familie"]`); other groups follow as the rows came. |
| `createEndpoint` | `{ url, bodyKey?, extra? }`: a new row is posted to this app endpoint instead of OpenRegister. With `bodyKey` the form values (plus the filter values) go under that key, beside `extra`: `{ "objectType": "contact", "object": { ... } }`. |

A column with `widget: "fkResolve"` takes `widgetProps.schemaFrom` (`{ field, map }`) to resolve the reference in the schema the row names.

## Row selection for a following card (`rowSelection`)

`"rowSelection": true` lets the reader select a row: a click selects it (and still opens `rowRoute` when one is set), and the selected row is marked. On a detail page the list publishes the rows it shows and the selected one under its widget id. A side card with `follows: { widget: "<this id>" }` then shows that row. See [CnDetailPage: a side card that follows a selected row](./cn-detail-page.md#a-side-card-that-follows-a-selected-row-follows).
