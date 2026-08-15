# CnRelatedCollections

Declarative related-object list sections for a `type:"detail"` page body.

Each entry renders a titled section containing a
[`CnObjectListWidget`](./cn-object-list-widget.md) scoped to the current
detail-page object via `@objectId` / `@object.<field>` filter tokens (resolved
by `CnObjectListWidget` from the `cnObjectContext` inject `CnDetailPage`
provides). Replaces the hand-coded "running cases / contracts / contacts"
sections on ClientDetail, ContactDetail, MdmMasterEntityDetail.

`CnDetailPage` mounts this automatically when the manifest page config declares
`relatedCollections`.

## Manifest config (consumed by CnDetailPage)

```jsonc
"config": {
  "register": "pipelinq", "schema": "client",
  "relatedCollections": [
    {
      "title": "Running cases",
      "register": "pipelinq", "schema": "case",
      "filter": { "client": "@objectId", "status": "open" },
      "columns": [{ "key": "title", "label": "Case" }, { "key": "status", "label": "Status" }],
      "limit": 10,
      "rowRoute": "cases-detail"
    },
    {
      "title": "Contracts",
      "register": "pipelinq", "schema": "contract",
      "filter": { "client": "@objectId" }
    }
  ]
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `collections` | `Array` | `[]` | Related-collection descriptors: `{ title?, register, schema, filter?, columns?, sort?, limit?, rowRoute? }`. Each maps 1:1 to a `CnObjectListWidget` content blob. `limit` defaults to `10`. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `row-click` | `{ collection, row, index }` | A row in a section was clicked. (The list already navigates to `rowRoute` when set; this is for extra host handling.) |

## Slots

| Slot | Scope | Description |
|------|-------|-------------|
| `section-action` | `{ collection, index }` | Right-aligned action surface in a section header (e.g. a "Link existing" relation-link button). |
