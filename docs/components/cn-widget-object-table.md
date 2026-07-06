# CnWidgetObjectTable

`CnWidgetObjectTable` is the built-in v2 widget that exposes
[CnDataTable](./cn-data-table.md) to the manifest layer. All data props
and listeners are forwarded; since ADR-049 (list-widget-enrichment) it
additionally carries a declarative self-fetching `source`, the compact
list surface, and declarative row/widget `actions[]` — so a fleet
dashboard list can be expressed entirely as a manifest widget entry with
no bespoke component.

## Import

```js
import { CnWidgetObjectTable } from '@conduction/nextcloud-vue'
```

## Manifest usage

Referenced via `widgetKey: "object-table"` in a v2 manifest page's
`widgets[]` array:

```json
{
  "id": "my-cases",
  "slot": "body",
  "widgetKey": "object-table",
  "gridX": 0, "gridY": 0, "gridWidth": 6, "gridHeight": 6,
  "props": {
    "source": {
      "register": "@resolve:tenant_register",
      "schema": "case",
      "filter": { "assignee": "@me", "status": "@workspace.openStatus?" },
      "order": { "dueDate": "asc" },
      "limit": 5
    },
    "columns": [
      { "key": "title", "label": "Case" },
      { "key": "dueDate", "label": "Due", "formatter": "daysUntil" }
    ],
    "hideHeader": true,
    "rowRoute": "case-detail",
    "viewAllRoute": { "name": "cases" },
    "emptyText": "No open cases",
    "actions": [
      { "id": "accept", "label": "Accept", "type": "object-op", "op": "patch", "values": { "status": "accepted" } },
      { "id": "remove", "label": "Remove", "type": "object-op", "op": "delete" },
      { "id": "add", "label": "New case", "type": "object-op", "op": "create", "values": { "status": "open" } }
    ]
  }
}
```

When `CnPageRenderer` mounts the page, `CnWidgetGrid` resolves the
`object-table` key against `BUILT_IN_WIDGETS`, instantiates this
wrapper, and passes the `props` map through.

## Declarative source (self-fetch)

`source` (`{ register, schema, filter, order, limit }`, default `null`)
drives CnDataTable's existing self-fetch — the widget does not
re-implement fetching:

- `filter` is token-resolved with the shared `resolveFilterTokens`
  grammar just before fetching: `@me`, `@today`, `@workspace.<key>`,
  `@objectId` / `@object.<field>` (on detail pages). A `?`-suffixed
  optional token that resolves to empty **drops its clause**
  (`dropOptionalUnresolved`) instead of failing the fetch; an unresolved
  *required* token skips the fetch entirely.
- `register` MAY carry an `@resolve:` sentinel — the widget passes it
  through **unexpanded** (resolution is the host loader's job).
- `order` becomes `_order[field]=asc|desc` fetch params; `limit` caps
  the rendered rows (the widget fetches `limit + 1` so the "View all"
  footer can detect that more rows exist).
- Externally supplied `rows` **always win** — passing `rows`/`columns`
  without a `source` behaves exactly as before.

## Declarative actions

`actions[]` (default `[]`) takes the unified manifest action shape
(`handler` | `open-modal` | `open-page` | `navigate` | `object-op`):

- Non-mutating types and `object-op` `patch` / `delete` render **per
  row** through [CnRowActions](./cn-row-actions.md) (`delete` styled
  destructive).
- `object-op` `create` renders as a **widget-scoped footer affordance**
  (there is no row to mutate) and creates against the widget `source`.
- `delete` is **always** confirm-gated through
  [CnConfirmDialog](./cn-confirm-dialog.md); `patch` / `create` confirm
  only when the action sets `confirm: true`.
- Mutations dispatch via the shared object store
  ([dispatchAction — object-op](../utilities/dispatch-action.md)). The
  manifest declares *intent only*: authorization-shaped fields have no
  effect, OpenRegister RBAC is the authority, and a rejected write
  surfaces an inline error with **no local mutation**. After a
  successful mutation the self-fetch refreshes and an `object-op` event
  is emitted (so hosts feeding external `rows` can refetch).

## Props

| Prop | Type | Description |
| --- | --- | --- |
| `source` | `Object` | Declarative self-fetch source `{ register, schema, filter, order, limit }` (default `null`). |
| `actions` | `Array` | Declarative actions (unified action shape incl. `object-op`, default `[]`). |
| `register` | `String` | Register slug for self-fetch mode (legacy direct prop). |
| `schema` | `String` | Schema slug for self-fetch mode (legacy direct prop). |
| `columns` | `Array` | Column definitions — bare string keys or the object form (`{ key, label, sortable, width, cellClass, formatter, widget, format, aggregate }`). |
| `rows` | `Array` | Pre-fetched rows — always win over `source` (disables self-fetch). |
| `loading` | `Boolean` | Loading flag forwarded to CnDataTable's skeleton state. |
| `hideHeader` | `Boolean` | Hide the column-header row (compact list surface, default `false`). |
| `borderless` | `Boolean` | Drop CnDataTable's card chrome (default `false`). |
| `rowRoute` | `String` | Route NAME for row-click navigation — mapped to CnDataTable's `rowClickRoute` with `{ params: { id } }`. |
| `viewAllRoute` | `Object` | vue-router location for the "View all" footer link (default `null`). |
| `viewAllLabel` | `String` | Pre-translated "View all" label (CnDataTable default when unset). |
| `emptyText` | `String` | Empty-state text (CnDataTable default when unset). |
| `rowIcon` | `String \| Function` | Leading per-row icon: MDI name or `(row) => iconName` (default `null`). |
| `title` | `String` | Widget title shown in the chrome header (default `'Table'`). |
| `documentation-url` | `String` | Documentation link for the overflow Actions menu (default `''`). |
| `widget-id` | `String` | Stable id forwarded to the widget chrome (default `''`). |
| `hideWrapper` | `Boolean` | Render content-only, without the widget's own CnWidgetWrapper chrome (default `false`). Set by hosts that already provide the card chrome — CnDashboardPage's registry branch mounts the widget this way to avoid a double card. |

All other props are forwarded to `CnDataTable` — see the
[CnDataTable docs](./cn-data-table.md) for the full surface.

## Dashboard registration (`type: "object-table"`)

Besides the v2 grid (`widgetKey: "object-table"`), the widget is
registered in the shared `dashboardWidgetRegistry` so a
`CnDashboardPage` widget definition with `type: "object-table"`
renders it — including through the in-app "Add widget…" picker (the
config form is the shared object-list form: register / schema /
filters / sort / limit / columns). The registered renderer is a
chrome-aware adapter: it mounts the widget with `hideWrapper: true`
inside the dashboard's own `CnWidgetWrapper`, and accepts the stored
`content` blob in either the flat form shape
(`{ register, schema, filter, sort, limit, columns }`) or the v2 prop
shape (`{ source, columns, actions, … }`).

## Slots

Every host-supplied CnDataTable scoped slot is forwarded verbatim —
notably `#footer` (`{ total, shown }`), `#empty`, and `#column-<key>`.
The `#row-actions` slot is withheld while the widget renders its own
declarative `actions[]` menu.

## Events

All listeners are forwarded to `CnDataTable` (`@row-click`, `@sort`,
etc.). The widget itself emits:

| Event | Payload | Description |
| --- | --- | --- |
| `object-op` | `{ action, row, result }` | After a successful declarative mutation — hosts feeding external `rows` refetch on it. |

## Spec

- REQ-MVR-006 (manifest-v2-renderer) — built-in widget: object-table
- list-widget-enrichment (ADR-049 Decision 2) — declarative source,
  actions, object-op, compact list surface
