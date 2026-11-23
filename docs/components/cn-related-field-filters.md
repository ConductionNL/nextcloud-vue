# CnRelatedFieldFilters

A filter bar whose filters come from a type's own field definitions. The values do not live on the listed row: each one is a row in a related schema that points back at it (a definition and a value). A number is asked as a range, a date as a date range, a declared list (`enumValues`) as a select, anything else as text. Only definitions with `filterable: true` are offered.

It is drawn by [CnFilterBar](./cn-filter-bar.md) with `range` and `dateRange` filters and no search field.

## On an index page

Declare it in the page config; [CnIndexPage](./cn-index-page.md) draws it beside the search:

```json
{
  "relatedFieldFilters": {
    "definitions": { "register": "dossiq", "schema": "propertyDefinition", "filter": { "caseType": "$route.query.caseType" } },
    "related": { "schema": "caseProperty", "backref": "case", "definitionKey": "propertyDefinition", "valueKey": "value" }
  }
}
```

## What it sends

OpenRegister's related-row query: one block per filled field, numbered after the backref when there is more than one.

```
_related[caseProperty][case][propertyDefinition]=pd-7
_related[caseProperty][case][value][gte]=100
_related[caseProperty][case][0][propertyDefinition]=pd-7
_related[caseProperty][case][1][propertyDefinition]=pd-9
```

The filters travel twice. The route query is the record (a shared link, a whole-result bulk act). The fetch goes through the list's `sidebarState.onFilterChange`, because the index page drops every `_`-prefixed route key before it builds its request. A shared link is replayed into the fetch on mount.

## Behaviour

- It renders nothing until the scope is set: a `definitions.filter` value written `$route.query.<key>` reads the route, and while it is empty the bar is hidden and its filters are cleared.
- Definitions that cannot be read offer no filters, the same as a type that declares none.
- A refused block is not an empty result. The object store's error for `storeKey` is read back and shown under the bar, naming the field ("The filter on bouwkosten was refused, so this list is not an answer.").

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `definitions` | Object | required | `{ register, schema, filter }`; a filter value `$route.query.<key>` reads the route |
| `related` | Object | required | `{ schema, backref, definitionKey?, valueKey? }` (defaults `propertyDefinition`, `value`) |
| `storeKey` | String | `''` | The object store key of the list, whose recorded error may be a refusal; CnIndexPage passes its own |

## Test ids

`related-field-filters`, `related-field-filters-refusal`, and per field `field-filter-<definition id>` (`-from` / `-to` on a range).
