# CnAppNav

Manifest-driven app navigation. Renders the manifest's `menu[]` array as `NcAppNavigation` + `NcAppNavigationItem`. Sorts by `order`; filters by `permission`; supports one level of nested `children[]`.

Items split into two groups by `section`:

- `section: "main"` (default) — top of the navigation, scrollable.
- `section: "settings"` — pinned to the bottom inside `NcAppNavigation`'s `#footer` slot, separated from the main list by a thin border. Use for documentation links, settings entries, or anything that should anchor below the scroll area.

`manifest`, `translate`, and `permissions` are read from injected values (provided by [`CnAppRoot`](./cn-app-root.md)) but can also be passed as props for standalone use. **Props always win over inject.**

**Wraps**: `NcAppNavigation`, `NcAppNavigationItem`

## Usage

### As a CnAppRoot child (typical)

```vue
<CnAppRoot :manifest="manifest" app-id="decidesk" :permissions="permissions" />
<!-- CnAppRoot mounts CnAppNav by default; no extra wiring needed. -->
```

### Standalone (props instead of inject)

```vue
<CnAppNav
  :manifest="manifest"
  :translate="translate"
  :permissions="permissions" />
```

### Manifest example

```json
{
  "menu": [
    { "id": "decisions", "label": "myapp.menu.decisions", "icon": "icon-checkmark", "route": "decisions-index", "order": 10 },
    { "id": "settings", "label": "myapp.menu.settings", "icon": "icon-settings", "route": "settings", "section": "settings", "order": 100 },
    { "id": "docs", "label": "myapp.menu.docs", "href": "https://example.com/docs", "section": "settings", "order": 110 }
  ]
}
```

## Menu item shape

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique identifier (used as Vue key) |
| `label` | `string` | Translation key — passed through `translate(label)` |
| `icon` | `string` | CSS class (e.g. `icon-checkmark`); the active-state filter only applies to `class*="icon-"` |
| `route` | `string` | Vue Router named route. Resolved against `manifest.pages` for `exact` matching |
| `href` | `string` | External link. Opens in a new tab with `noopener,noreferrer`. Mutually exclusive with `route` |
| `order` | `number` | Sort order (ascending). Items without `order` render after items with `order` |
| `section` | `'main' \| 'settings'` | Default `'main'`. `'settings'` items render in the bottom footer list |
| `permission` | `string` | When set, the item only renders if the value appears in the `permissions` prop / inject |
| `children` | `Array<MenuItem>` | One level of children supported. Each child is filtered by permission independently |

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `manifest` | `Object \| null` | `null` | Manifest object. Falls back to injected `cnManifest`. |
| `translate` | `Function \| null` | `null` | Translator used for labels. Falls back to injected `cnTranslate` (identity by default). |
| `permissions` | `Array<string>` | `[]` | Permissions held by the current user. Empty means all items render regardless of their `permission` field. |

## Behaviour

- **Active state** — an item is active when `$route.name === item.route`. External (`href`) items never appear active.
- **Exact matching** — when the resolved page's `route === '/'`, `exact` is set on the underlying router-link. Without this, the root item would look permanently active for nested routes.
- **External links** — `href` items return `null` for `:to`, intercept the click, call `preventDefault()`, then open the URL via `window.open(..., '_blank', 'noopener,noreferrer')`.
- **Active icon colour** — `icon-*` background-image classes have a hardcoded dark fill, so the component injects `filter: brightness(0) invert(1)` to whiten them when active. `<template #icon>` MDI components inherit `currentColor` and don't need this.

## Dynamic per-tenant menu entries

The menu CnAppNav renders is whatever [`useAppManifest`](../utilities/composables/use-app-manifest.md) ultimately resolves to — including `menu[]` arrays supplied by the backend `/api/manifest` endpoint. Apps that need per-tenant menu fan-out (e.g. one entry per catalogue or organisation) populate the resolved list in their backend; CnAppNav renders whatever the merged manifest contains. See the [Dynamic per-tenant menu entries](../utilities/composables/use-app-manifest.md#dynamic-per-tenant-menu-entries) section for the contract.

## Related

- [CnAppRoot](./cn-app-root.md) — Provides the `manifest` / `translate` / `permissions` values via inject.
- [useAppManifest](../utilities/composables/use-app-manifest.md) — Loads, merges, and validates the manifest CnAppNav renders.
- [migrating-to-manifest](../migrating-to-manifest.md) — Adoption guide.
