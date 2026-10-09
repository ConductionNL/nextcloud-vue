# CnPropertySourceField

A type-ahead over a registry (integriq `registry-field-source`) for a schema property that declares `x-openregister-property-source`. `CnFormDialog` renders it automatically for the `property-source` widget; use it directly when you build your own form.

From `minChars` (3) typed characters, debounced, it asks `GET /apps/integriq/api/property-sources/{provider}/suggest?q=` and lists the suggestion labels. On a pick it calls `.../resolve?identifier=` and only then sets the value, which is the identifier. A line under the field names the provider, the read time, and says "From cache." or "Source unreachable." when the answer says so.

Without integriq, with an unknown provider (404), without permission (401/403) or with an unreachable source the field becomes a plain text input with a one-line reason, and the form still saves.

## Usage

```vue
<CnPropertySourceField
  provider="kvk"
  input-label="KvK number"
  :model-value="kvk"
  @update:modelValue="kvk = $event"
  @resolved="({ value }) => name = value.naam" />
```

## Fill map in CnFormDialog

A property declares `x-openregister-property-source: { provider, mode, config }`. With `mode: "default"` and `config.fill = { targetKey: sourcePath }`, a pick fills each empty target field from the resolved value (`sourcePath` supports dots and `[n]`; `=NL` is a literal; a dotted `targetKey` reaches a field of an object property). Targets that already hold a different value are listed in one confirmation; declining keeps them while the empty ones are still filled. Mode `live` (the default) fills nothing.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `provider` | String | — (required) | Registry provider id, e.g. `kvk`, `bag` or `brp`. |
| `modelValue` | String \| Number | `''` | Stored identifier (v-model). |
| `mode` | String | `'live'` | Declaration mode: `live` reads the source where it is shown, `default` is a one-off copy. |
| `inputLabel` | String | `''` | Accessible label of the field. |
| `inputId` | String | `''` | DOM id of the input. |
| `placeholder` | String | `''` | Placeholder text. |
| `clearable` | Boolean | `true` | Whether the value can be cleared. |
| `disabled` | Boolean | `false` | Disable the field. |
| `error` | Boolean | `false` | Show the field in its error state. |
| `minChars` | Number | `3` | Characters needed before the first suggest request. |
| `debounce` | Number | `300` | Milliseconds to wait after typing before suggesting. |
| `providerLabel` | String | `''` | Human name of the provider for the provenance line; defaults to the provider id. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:modelValue` | `string` | The identifier (or the typed text in plain-text fallback). |
| `resolved` | `{ identifier, value, provenance }` | Emitted after a successful resolve of a pick. |
