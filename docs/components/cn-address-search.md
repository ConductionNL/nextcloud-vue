# CnAddressSearch

An address field over the PDOK Locatieserver: BAG addresses, streets, places and postcodes. It suggests as the reader types, runs a free-text search when nothing is suggested, and on a pick looks up the full document and emits it with its coordinates. It is built on [CnSearchSelect](./cn-search-select.md).

Browsers never call api.pdok.nl directly. Requests go to a PDOK proxy that serves `suggest`, `free` and `lookup/{id}`. By default that is the `/api/pdok` route of the first installed app in `appCandidates` (integriq, then openconnector, its former id). Use `endpoint` to name another base URL. When the proxy answers 404 (not installed) or 503 (PDOK down), the field says address search is not available and stays usable, so a form around it can still be saved.

## Usage

```vue
<CnAddressSearch
  v-model="form.address"
  label-outside
  @select="onAddress" />
```

```js
onAddress(chosen) {
  // chosen: { result, coordinates: { lat, lng } | null, address } or null when cleared
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | String | `null` | The chosen address text |
| `endpoint` | String | `''` | Base URL of the PDOK proxy; empty resolves it from `appCandidates` |
| `appCandidates` | Array | `['integriq', 'openconnector']` | App ids that serve `/api/pdok`, newest first; the first installed one wins |
| `inputLabel` | String | `''` | The field's label; defaults to "Search an address" |
| `labelOutside` | Boolean | `false` | Draw the label above the field |
| `placeholder` | String | `''` | Placeholder; defaults to "Street, postcode or place" |
| `clearable` | Boolean | `true` | Offer a clear button |
| `disabled` | Boolean | `false` | Disable the field |
| `minLength` | Number | `3` | The fewest characters a search needs |
| `rows` | Number | `10` | The most results a free-text search returns |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:modelValue` | address text or `null` | The chosen address |
| `select` | `{ result, coordinates, address }` or `null` | The looked-up document, `{ lat, lng }` or `null`, and the display text |

## Helpers

`addressCoordinates(doc)` and `addressText(doc)` are named exports of the component file. They read `{ lat, lng }` and the display text from a normalised document (`location.coordinates`, `displayName`) or a raw Locatieserver one (`centroide_ll`, `weergavenaam`).
