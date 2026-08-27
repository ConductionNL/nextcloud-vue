# CnIconPicker

Select-plus-upload picker for the dashboard `icon` convention, with an opt-in **multi-source** mode.

**Legacy mode (default):** the built-in grid enumerates `icons` (name → component, default `DASHBOARD_ICONS`); the optional file-upload reads a data URL, hands it to the injected `uploadFn`, and emits the returned URL. Passing only `v-model` renders exactly as before multi-source support was added.

**Enriched mode (opt-in):** set any of `searchable`, `sources` (beyond the default single `mdi`), `catalogues`, or `allowCustomSvg` to switch to a searchable, capped grid over one or more icon sources — MDI, FontAwesome, OpenGemeenten — plus an optional custom-SVG editor and left/right placement. The library bundles **no icon pack**: pass a `catalogues` map built with the [`fromMdiJs`](../utilities/from-mdi-js.md) / [`fromFontAwesome`](../utilities/from-font-awesome.md) / [`fromOpenGemeenten`](../utilities/from-open-gemeenten.md) adapters. When the `mdi` source is enabled without a supplied catalogue, the picker lazy-loads the optional `@mdi/js` dependency and falls back to `DASHBOARD_ICONS` when it is absent. See the README "Icon sets & licensing" section for attribution and licensing.

Vue 2 v-model: `value` in, `input` out. Placement uses `v-model:placement`.

```vue
<CnIconPicker v-model="icon" :upload-fn="uploadDataUrl" />

<CnIconPicker
  v-model="icon"
  searchable
  :sources="['mdi', 'fontawesome']"
  :catalogues="{ fontawesome: fromFontAwesome({ fas }) }"
  allow-custom-svg
  v-model:placement="placement" />
```

## Props

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `String` | `null` | Current icon value — a registry key, a source value, a URL, raw SVG, or null (v-model). |
| `modelValue` | `String` | `undefined` | The same value under Vue 3's v-model name. `v-model` binds THIS, not `value` — both are accepted. |
| `icons` | `Object` | `DASHBOARD_ICONS` | Legacy icon registry to enumerate in the grid (name → component). Used in legacy mode and as the MDI fallback. |
| `sources` | `String[]` | `['mdi']` | Enriched mode: which icon sets to offer (`mdi` / `fontawesome` / `opengemeenten`). Setting anything other than the single default `['mdi']` activates enriched mode. |
| `catalogues` | `Object` | `{}` | Enriched mode: consumer-supplied catalogues keyed by source name, built with the exported adapters. The library bundles no icon pack. |
| `searchable` | `Boolean` | `false` | Enriched mode: show a search box that filters the active source (with a display cap, lifted while searching). |
| `allowCustomSvg` | `Boolean` | `false` | Enriched mode: offer a custom-SVG editor with a Format action. |
| `placement` | `'left'\|'right'` | `'left'` | Icon placement (`v-model:placement`). A left/right toggle is shown only when `placement` is bound. |
| `uploadFn` | `Function` | `null` | Injected upload transport `async (dataUrl) => ({ url })`. When null, the upload control is hidden. |
| `compact` | `Boolean` | `false` | Compact mode — render a small trigger button that opens the icon grid as a popover instead of an always-visible grid. |
| `clearable` | `Boolean` | `false` | Show a leading "None" tile that clears the selection (emits `null`). Off by default so existing pickers are unchanged. |

> **Why two props.** Vue 3 compiles `v-model="x"` to `:modelValue` + `@update:modelValue`. A component declaring only `value`/`input` never receives the prop and its emit is never heard — silently. `value` is kept as the public name for existing consumers; `modelValue` is what a plain `v-model` binds, and both emit on every change.


## Events

| Name | Description |
|------|-------------|
| `input` | Emitted with the new icon value (registry key, source value, URL, raw SVG, or null). |
| `update:placement` | Emitted when the placement changes (`v-model:placement`). |

See also [CnDashboardIcon](./cn-dashboard-icon.md) for rendering; the [`fromMdiJs`](../utilities/from-mdi-js.md) / [`fromFontAwesome`](../utilities/from-font-awesome.md) / [`fromOpenGemeenten`](../utilities/from-open-gemeenten.md) / [`dedupeCatalogue`](../utilities/dedupe-catalogue.md) adapters; and the `DASHBOARD_ICONS` / `DEFAULT_ICON` / `getIconComponent` / `isCustomIconUrl` helpers.
