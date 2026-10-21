---
sidebar_position: 35
---

# CnSearchPage

Cross-schema search surface. Renders a query input, a facet sidebar, and a results list. Mounted by `CnPageRenderer` when a manifest page declares `type: 'search'`. The widget owns the UI; consumers wire the actual search + facet aggregation through `@search`.

## Manifest

```json
{
  "id": "Search",
  "route": "/search",
  "type": "search",
  "title": "Search",
  "config": {}
}
```

## Try it

```vue
<CnSearchPage
  v-model:query="q"
  :facets="facets"
  :active-facets="activeFacets"
  :results="results"
  :total-count="total"
  :loading="loading"
  @search="onSearch"
  @result-click="openResult" />
```

```js
async function onSearch({ query, facets }) {
  loading = true
  const resp = await axios.get('/api/search', { params: { q: query, facets } })
  results = resp.data.results
  total = resp.data.total
  // Update activeFacets from facets-change if the consumer's persisting them
  loading = false
}
```

## Result shape

```ts
{
  id: string,
  title?: string,
  snippet?: string,
  schema?: string,    // shown as a badge
  subtitle?: string,
  ...                // forwarded to the #result slot
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | String | `'Search'` | Heading. |
| `query` | String | `''` | Controlled query. Use `.sync`. |
| `placeholder` / `ariaLabel` / `searchLabel` | String | — | Input + submit-button labels. |
| `facets` | `Array<{key,label?,multiple?,options:[{value,label?,count?}]}>` | `[]` | Facet declarations. Empty hides the sidebar. |
| `activeFacets` | `Record<string,Array<string>>` | `{}` | Active facet values (controlled). |
| `results` | `Array<object>` | `[]` | Result entries. |
| `totalCount` | Number | `0` | Total matching count (drives the "more" footer). |
| `loading` | Boolean | `false` | Show loading state. |
| `emptyLabel` / `idleLabel` / `loadingLabel` | String | — | State texts. |
| `facetsTitle` / `clearFacetsLabel` | String | — | Sidebar labels. |
| `totalCountLabel` | Function | `(t, s) => …` | "Showing X of Y" formatter. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `search` | `{ query, facets }` | Fired on Submit + every facet change. |
| `query-change` / `update:query` | String | Every keystroke (debounce in the parent). |
| `facets-change` | `Record<string,Array<string>>` | New active-facets map. |
| `result-click` | `result` | Result-row click. |

## Slots

- `#result` — replaces the default result-row body. Scope: `{ result }`.

## Follow-up

- Saved searches / shareable URLs (consumer-side serialization → URL params).
- Highlighted query terms in snippets (consumer-side substring decoration).
- Type-ahead / suggestions API.

## Searching lists from the manifest

A `search` page that names `sources` runs the search itself: one request per list (`_search` and `_limit`, 10 by default), the results in the order of the lists, and the lists offered as a Type filter with their totals. A result opens the page `route` names, with its id.

```json
{
  "id": "Search", "route": "/search", "type": "search", "title": "Search",
  "config": {
    "sources": [
      { "id": "meetings", "label": "Meetings", "register": "decidiq", "schema": "meeting", "route": "MeetingDetail" },
      { "id": "decisions", "label": "Decisions", "register": "decidiq", "schema": "decision", "route": "DecisionDetail", "snippetField": "text" }
    ]
  }
}
```

`titleField` names the field a result reads as its title (else `title`, then `name`). Without `sources` the page is controlled as before: `results` and `facets` come from props.
