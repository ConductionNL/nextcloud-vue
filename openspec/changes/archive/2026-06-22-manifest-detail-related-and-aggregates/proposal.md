# Manifest detail related-collections, summary-aggregates & relation-link

## Why

The conversion audit found that pipelinq's largest bespoke detail views —
ClientDetail (~1151 lines), ContactDetail, MdmMasterEntityDetail — stay
`type:"custom"` because they hand-code three things CnDetailPage couldn't
express declaratively:

1. **Related-object sections** ("running cases", "contracts", "contacts"
   belonging to this client) — lists from OTHER schemas filtered by the
   current object.
2. **Cross-schema summary numbers** in the header ("12 open cases", "€4.2k
   outstanding") — count/sum/avg over a related schema.
3. **A relation-link action** — search an existing object in another schema
   and link it (patch a foreign key on the current object).

CnDetailPage already provides the `cnObjectContext` inject and
`CnObjectListWidget` already resolves `@objectId` / `@object.<field>` filter
tokens against it; the ad-hoc aggregation contract (`/value`,
`runAdhocByRef`) and `CnResourceSelect`'s create-from-search picker already
exist. This change wires those existing pieces into three additive
CnDetailPage config blocks so a manifest author declares them instead of
writing a custom page.

## What changes

- **`relatedCollections` prop + `CnRelatedCollections`** — an array of
  `{ title?, register, schema, filter?, columns?, sort?, limit?, rowRoute? }`
  rendered as titled `CnObjectListWidget` sections below the body, each
  filtered to the current object via `@object*` tokens.
- **`summaryAggregates` prop + `CnSummaryAggregates`** — an array of
  `{ label, register, schema, metric?, field?, filter?, format? }` rendered
  as stat chips in the header; each runs one aggregate via the `/value`
  endpoint, scoped to the object. `fetchAggregateValue` / `flattenAggFilter`
  gain an optional `ctx` arg so `@objectId` resolves (back-compatible).
- **`relationLinks` prop + `CnRelationLinkModal`** — an array of
  `{ label?, register, schema, fkField, labelField?, allowCreate? }`; each
  renders a button opening a search-and-link modal (reusing
  `CnResourceSelect`) that patches `fkField` on the current object with the
  chosen object's id and saves.

All three are additive and default to empty — omitting them keeps the page's
current behaviour exactly. Manifest `config.*` flows through CnPageRenderer
unchanged.

## Impact

- Affected: `CnDetailPage` (3 optional props + 2 events), new exports
  `CnRelatedCollections`, `CnSummaryAggregates`, `CnRelationLinkModal`;
  `fetchAggregateValue` / `flattenAggFilter` optional `ctx` param.
- No breaking change. Consumers: pipelinq ClientDetail / ContactDetail /
  MdmMasterEntityDetail can convert to declarative `type:"detail"`.
