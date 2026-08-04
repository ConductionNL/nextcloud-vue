# CnIconBrowser

A searchable, visual icon picker. The library imports **no icon package** — the consuming app owns that choice and injects a normalized catalogue via the `icons` prop. The default **Icons** tab browses that catalogue through a search box and a capped grid; the optional **Custom** tab offers curated image-URL icons (`urlIcons`) and — when an `uploadFn` is supplied — an upload control.

Vue 2 v-model: `value` in, `input` out — a single string. What it holds is the catalogue's choice (see the adapters): an SVG **path** for `@mdi/js`, a component **name** for `vue-material-design-icons`, or a **URL** for a custom/uploaded image.

The search box is **fuzzy** and separator-insensitive: it matches on each entry's `label` and `key` as an order-preserving subsequence, ignoring spaces/dashes/case. So `CalendarRange`, `calendar range`, `calendarrange` and `cal rng` all find *Calendar Range*; results are ranked best-match first.

## Supplying a catalogue

Two adapters turn a popular icon source into the `icons` shape:

```vue
<!-- @mdi/js (path strings, self-contained values) -->
<script>
import * as mdi from '@mdi/js'
import { mdiCatalogue } from '@conduction/nextcloud-vue'
export default { computed: { icons() { return mdiCatalogue(mdi) } } }
</script>
<template><CnIconBrowser v-model="icon" :icons="icons" /></template>
```

```js
// vue-material-design-icons (Vue components — the Nextcloud-native set).
// Use a LAZY require-context so only the visible icons load.
import { vmdiCatalogue } from '@conduction/nextcloud-vue'
const ctx = require.context('vue-material-design-icons', false, /\.vue$/, 'lazy')
const icons = vmdiCatalogue(ctx) // each entry emits the component name, e.g. 'CalendarRange'
```

A catalogue entry is `{ key, label, value, search?, path?, component? }`; the browser renders `path` inline as `<svg>` or `component` via `<component :is>`, and emits the entry's `value`. You can also build catalogues by hand.

> Note: `@mdi/js` and `vue-material-design-icons` are generated from the same Material Design Icons master — identical icons. Pick by what your app already depends on and how you want to render the *stored* value (a path renders anywhere; a component name needs the package present).

By default the picker is a trigger button that opens the panel in a popover — tidy for forms and dense rows. Pass `inline` to render the panel always-open (good inside a roomy settings panel):

```vue
<CnIconBrowser v-model="icon" :icons="icons" inline />
```

See [mdiCatalogue](../utilities/mdi-catalogue.md) and [vmdiCatalogue](../utilities/vmdi-catalogue.md).

## Props

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `String` | `null` | Current selection (v-model) — the catalogue's emitted value (path / name / …), a URL, or null. |
| `icons` | `Array` | `[]` | The catalogue to browse: `[{ key, label, value, search?, path?, component? }]`. Build with `mdiCatalogue` / `vmdiCatalogue`. |
| `urlIcons` | `Array` | `[]` | Curated image-URL icons for the Custom tab: `[{ label, url }]`. Each emits its `url` when picked. |
| `urlIconGroups` | `Array` | `[]` | Curated image-URL icons split into named groups, rendered on the Custom tab as one sub-tab per group with its own search: `[{ key, label, icons: [{ id?, label, url }] }]`. Use instead of the flat `urlIcons` for large packs such as the bundled NL Design catalogues (`NL_DESIGN_ICON_GROUPS`). |
| `uploadFn` | `Function` | `null` | Injected upload transport `async (dataUrl) => ({ url })`. When null, the upload control is hidden. |
| `maxResults` | `Number` | `150` | Maximum icon cells rendered in the grid; a hint shows when matches exceed the cap. |
| `defaultIcons` | `Array` | `[]` | Catalogue `key`s shown when the search box is empty. Falls back to the first `maxResults` in catalogue order. |
| `inline` | `Boolean` | `false` | Render the panel always-open inline. Off (default) renders a trigger button that opens the panel in a popover. |
| `showLabels` | `Boolean` | `false` | Show the human label under each icon cell. |
| `allowUrl` | `Boolean` | `false` | Add a free-text image-URL input to the Custom tab, so the picker can also hold an arbitrary URL (the icon-or-URL fields). |
| `label` | `String` | `''` | Optional field label rendered above the control (convenience for form fields). |
| `clearable` | `Boolean` | `false` | Offer a control to unset the icon (emits `null`). Use for optional icon fields, where a picked icon would otherwise be impossible to remove. |
| `sources` | `Array` | `[]` | Ordered catalogue source keys, one tab each (e.g. `['mdi', 'fontawesome', 'opengemeenten']`). Empty renders a single "Icons" tab over the resolved icons. |
| `allowCustomSvg` | `Boolean` | `false` | Offer a tab for authoring a raw `<svg>` icon by hand. |

## Catalogue injection

When no `icons` prop is passed, `CnIconBrowser` uses an app-provided catalogue from Vue `provide('cnIconCatalogue', catalogue)` — handy for deeply-nested forms that can't easily thread a prop. If neither is present, it falls back to a small curated set (built from the library's bundled `vue-material-design-icons`) so the picker still works. Pair with `CnWidgetIcon` / `CnDashboardIcon`, which render whatever value the catalogue emits (path / registry name / URL).

## Events

| Name | Description |
|------|-------------|
| `input` | Emitted with the new icon value — an SVG path string, a URL, or null. |

## Slots

| Name | Description |
|------|-------------|
| `trigger` | Popup-mode trigger (default). Scoped: `{ open, toggle, value, label }`. |
| `empty` | Shown when no icons match the search query. |

See also [CnDashboardIcon](./cn-dashboard-icon.md) for rendering (it understands path strings, URLs, and registry keys) and [CnIconPicker](./cn-icon-picker.md) for the simpler curated-registry picker.
