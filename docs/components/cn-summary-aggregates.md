# CnSummaryAggregates

Declarative count / sum / avg stat chips for a `type:"detail"` page header.

Each entry runs **one** aggregation (via OpenRegister's ad-hoc `/value` endpoint —
the `runAdhocByRef` contract) over a related schema, scoped to the current
detail-page object through `@objectId` / `@object.<field>` filter tokens, and
shows the result as a small labelled chip. Lets a detail page surface
"12 open cases / €4.2k outstanding" without per-app code.

`CnDetailPage` mounts this automatically when the manifest page config declares
`summaryAggregates`. It reads the page's `cnObjectContext` inject so the filter
tokens resolve against the live object.

## Manifest config (consumed by CnDetailPage)

```jsonc
"config": {
  "register": "pipelinq", "schema": "client",
  "summaryAggregates": [
    { "label": "Open cases", "register": "pipelinq", "schema": "case",
      "metric": "count", "filter": { "client": "@objectId", "status": "open" } },
    { "label": "Outstanding", "register": "pipelinq", "schema": "invoice",
      "metric": "sum", "field": "amount", "filter": { "client": "@objectId", "paid": false },
      "format": "currency" }
  ]
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `aggregates` | `Array` | `[]` | Aggregate descriptors: `{ label, register, schema, metric?, field?, filter?, format? }`. `metric` defaults to `count`; `field` is required for `sum`/`avg`; `format: 'currency'` renders a EUR amount. |

## Notes

- Filter values support every `resolveFilterTokens` token; `@objectId` /
  `@object.<field>` resolve against the detail page's object.
- Renders nothing when `aggregates` is empty.
- A value that can't be fetched shows an em dash (`—`).
