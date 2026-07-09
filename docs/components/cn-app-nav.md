# CnAppNav

Manifest-driven app navigation. Renders the manifest's `menu[]` array as `NcAppNavigation` + `NcAppNavigationItem`. Sorts by `order`; filters by `permission`; supports one level of nested `children[]`.

Items split into three groups by `section`:

- `section: "main"` (default) — top of the navigation, scrollable.
- `section: "footer"` — **regular** entries rendered flat in `NcAppNavigation`'s `#footer` slot, outside the scrollable list and directly above the settings foldout, so they stay visible regardless of menu length. For always-visible, non-settings links: Documentation, Features & Roadmap, About.
- `section: "settings"` — rendered INSIDE an `NcAppNavigationSettings` foldout (the NC-native gear-icon button that slides a panel open). A **"Personal settings"** entry is auto-prepended at the top of the foldout (opens the host's `NcAppSettingsDialog` via `cnOpenUserSettings`); opt out with `nav.includePersonalSettings: false`. The foldout mounts whenever there are `settings` items **or** personal settings is enabled — so every app shows a Settings gear with at least Personal settings; it's only fully suppressed when there are no `settings` items **and** `nav.includePersonalSettings: false`.

### Primary action

An optional primary action renders above the main list as an `NcAppNavigationNew` button — for a "new" button or an active-context switcher (e.g. OpenRegister's active-organisation button). Two ways to provide it:

- **`#primary-action` slot** — full control over dynamic content and click handling. Use this when the button reflects live state (a store-driven label) or needs custom navigation. The slot **wins** when both are present.
- **Page-scoped `pages[].primaryAction`** — declarative, active-page scoped. The same shape as `nav.primaryAction` plus an optional free-form `payload`. Used for the common case where each index page wants its own `+ New X` button. Resolution order: page-scoped wins over `nav.primaryAction` whenever the current route matches a page that declares one.
- **`nav.primaryAction` manifest field** — declarative app-wide default (`{ id?, label, icon?, route?, href?, payload? }`). On click it emits `primary-action` (and back-compat `primary-action-click`), then navigates: `href` opens in a new tab, `route` pushes the named vue-router route.

Nothing renders when neither is provided (backwards compatible). The `primaryAction` icon defaults to MDI `Plus` when `icon` is omitted (matches the `NcAppNavigationNew` default).

### `nav` block

Top-level manifest config for the navigation:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `nav.includePersonalSettings` | Boolean | `true` | Auto-prepend the "Personal settings" entry in the foldout. Set `false` for apps with no per-user settings dialog. |
| `nav.settingsLabel` | String | `'Settings'` | Override the foldout gear-button label. |
| `nav.primaryAction` | Object | — | App-wide default primary-action button above the main list: `{ id?, label, icon?, route?, href?, payload? }`. Overridden by `pages[].primaryAction` for the active route, and overridden by the `#primary-action` slot. |

### Page-scoped `primaryAction`

Each `pages[]` entry MAY declare its own `primaryAction` block (same shape as `nav.primaryAction`). When the current route matches a page that declares one, the page-scoped block wins over `nav.primaryAction`. This is the common case — an index page wants its own `+ New X` button:

```json
{
  "pages": [
    {
      "id": "decisions",
      "route": "/decisions",
      "type": "index",
      "title": "Decisions",
      "primaryAction": {
        "id": "create-decision",
        "label": "+ New decision",
        "icon": "Plus",
        "payload": { "presetSchema": "decision" }
      }
    }
  ]
}
```

The host listens once at `CnAppRoot` (events bubble through `CnPageRenderer`):

```vue
<CnAppRoot @primary-action="openCreateDialog">
```

`payload` arrives unchanged so the host dispatcher can branch on it.

### Slots

| Slot | Description |
|------|-------------|
| `primary-action` | Replaces the manifest-driven primary-action button. Render an `NcAppNavigationNew` (or anything) with your own dynamic label and click handler. |
| `search` | Forwarded into `NcAppNavigation`'s `#search` slot. Mount your `NcAppNavigationSearch` here; when unset no search input renders. |
| `item-<id>-actions` | Per-item scoped slot whose content lands inside the `NcAppNavigationItem`'s `#actions` slot for the entry with that `id`. Scope: `{ item }`. Use it for inline `NcActions` menus (e.g. an item-level "Pin" button). |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `primary-action` | `{ id?, label, icon?, route?, href?, payload?, page? }` | Emitted when the resolved primary-action button is clicked. `page` is the current `$route.name`; `payload` echoes the manifest's free-form payload field. Hosts dispatch on `id` to wire create flows. |
| `primary-action-click` | resolved primary-action object | Back-compat alias for `primary-action`. New code should listen on `primary-action`. |

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
    { "id": "user-settings", "label": "myapp.menu.settings", "icon": "icon-settings", "action": "user-settings", "section": "settings", "order": 100 },
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
| `href` | `string` | Destination URL. Renders the entry as a real anchor (visible on hover, native link cursor) instead of a router link. External URLs (`scheme://`) open in a new tab (`NcAppNavigationItem` adds `target="_blank"`); internal app paths (e.g. `/index.php/apps/foo/`) navigate in the same tab. Mutually exclusive with `route` |
| `action` | `'user-settings'` | Built-in action. `user-settings` invokes the injected `cnOpenUserSettings()` (provided by [`CnAppRoot`](./cn-app-root.md)) and opens the host `NcAppSettingsDialog`. Both `route` and `href` are ignored when `action` is set |
| `order` | `number` | Sort order (ascending). Items without `order` render after items with `order` |
| `section` | `'main' \| 'footer' \| 'settings'` | Default `'main'`. `'footer'` = flat entry in the navigation's `#footer` region (outside the scroll list, always visible above the settings foldout); `'settings'` = inside the gear-icon foldout |
| `type` | `'item' \| 'caption'` | Default `'item'`. `'caption'` renders an `NcAppNavigationCaption` (non-interactive section divider) — `route`, `href`, `action`, `icon`, `count`, `children`, and `pinned` are ignored |
| `count` | `number \| 'auto'` | Counter badge rendered in the `#counter` slot via `NcCounterBubble`. A positive integer renders as-is; `'auto'` resolves the count reactively from the `cnMenuCounts` inject (populated by [`CnAppRoot`](./cn-app-root.md) from `useObjectStore` totals) for the entry's resolved `type: "index"` page (`{ register, schema }` in its `config`). A resolved `0` / `null` / `undefined` renders no badge |
| `pinned` | `boolean` | Default `false`. Pass-through to `NcAppNavigationItem`'s `pinned` prop for `"main"` entries inside the top list. `section: "footer"` entries no longer use `pinned` — they render in the navigation's `#footer` region instead |
| `open` | `boolean` | Default `false`. Initial expansion state for a parent entry with `children[]`. When `true`, the parent renders with `:open="true"` so children are visible on mount; users can still collapse/expand interactively |
| `permission` | `string` | When set, the item only renders if the value appears in the `permissions` prop / inject |
| `children` | `Array<MenuItem>` | One level of children supported. Each child is filtered by permission independently. Parents with visible children get `:allow-collapse="true"` automatically |
| `visibleIf` | `object` | Optional display condition block — see [visibleIf conditions](#visibleif-conditions) |

## visibleIf conditions

`visibleIf` gates a menu item behind one or more conditions. All conditions use implicit AND — every condition must pass for the item to render. Items without `visibleIf` are always visible (backwards-compatible).

### `appInstalled` — cross-app link guard

```json
{
  "id": "view-in-mydash",
  "label": "scholiq.nav.viewInMydash",
  "href": "/index.php/apps/mydash#scholiq",
  "visibleIf": { "appInstalled": "mydash" }
}
```

Checks `OC.appswebroots` first, then the capabilities API as fallback. Result is cached per page load.

### Context-path predicates — role-based / runtime-field gating

Any key other than `appInstalled` is treated as a **dot-separated path into `manifest.runtime`**. The value is a predicate expression:

| Predicate form | Example | Passes when… |
|----------------|---------|--------------|
| scalar | `"compliance-officer"` | value `===` the scalar (strict eq) |
| `{ eq: <scalar> }` | `{ eq: "hr-coordinator" }` | value `===` eq |
| `{ in: [<scalar>, …] }` | `{ in: ["hr", "compliance"] }` | value is in the array |
| `{ notIn: [<scalar>, …] }` | `{ notIn: ["guest"] }` | value is NOT in the array |
| `{ gt / gte / lt / lte: <num or ISO date> }` | `{ gt: 0 }` | numeric / date comparison |
| `{ truthy: true }` | `{ truthy: true }` | `Boolean(value) === true` |
| `{ truthy: false }` | `{ truthy: false }` | `Boolean(value) === false` |

The backend (OpenRegister) injects `manifest.runtime` when serving the manifest for an authenticated request. When `runtime` is absent and context-path predicates are declared, the item is hidden (fail-safe — never show role-gated content to unidentified users).

**Examples:**

```json
{
  "id": "compliance-dashboard",
  "label": "scholiq.nav.complianceDashboard",
  "route": "compliance-dashboard",
  "visibleIf": {
    "user.primaryRole": { "in": ["compliance-officer", "hr-coordinator"] }
  }
}
```

```json
{
  "id": "overdue-banner",
  "label": "scholiq.nav.overdue",
  "route": "overdue-courses",
  "visibleIf": {
    "user.isOverdueOnMandatoryTraining": true
  }
}
```

**Combined `appInstalled` + context predicate** (both must pass):

```json
{
  "id": "combined",
  "label": "scholiq.nav.combined",
  "href": "/apps/mydash#scholiq",
  "visibleIf": {
    "appInstalled": "mydash",
    "user.primaryRole": { "in": ["compliance-officer"] }
  }
}
```

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
- **User settings action** — items with `action: "user-settings"` return `null` for `:to`, intercept the click, and invoke the injected `cnOpenUserSettings()`. CnAppRoot provides this inject and toggles its hosted `NcAppSettingsDialog`. When CnAppNav is mounted standalone (no CnAppRoot ancestor), the inject defaults to a no-op so the click silently does nothing.
- **Group headers toggle on title click** — an item with no `route` / `href` / `action` but with visible `children[]` is a pure group header: its anchor would be a dead `#` link, so clicking the title toggles the children open/closed — the same effect as the collapse chevron. CnAppNav tracks this expand/collapse state locally (seeded from the manifest's `item.open`, kept in sync with chevron clicks via `update:open`), so both click targets always agree.
- **Active icon colour** — `icon-*` background-image classes have a hardcoded dark fill, so the component injects `filter: brightness(0) invert(1)` to whiten them when active. `<template #icon>` MDI components inherit `currentColor` and don't need this.

## Dynamic per-tenant menu entries

The menu CnAppNav renders is whatever [`useAppManifest`](../utilities/composables/use-app-manifest.md) ultimately resolves to — including `menu[]` arrays (and nested `children[]`) supplied by the backend `/api/manifest` endpoint. Apps that need per-tenant menu fan-out (e.g. one entry per catalogue, organisation, or case type) populate the resolved entries in their backend; CnAppNav renders whatever the merged manifest contains. See [Overriding an app's manifest at runtime](../manifest-runtime-override.md) for the full feature — the endpoint contract, the `deepMerge` vs `delta` strategies, and how nested children merge by `id`.

## Related

- [CnAppRoot](./cn-app-root.md) — Provides the `manifest` / `translate` / `permissions` values via inject.
- [useAppManifest](../utilities/composables/use-app-manifest.md) — Loads, merges, and validates the manifest CnAppNav renders.
- [migrating-to-manifest](../migrating-to-manifest.md) — Adoption guide.
