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
- **`nav.primaryAction` manifest field** — declarative app-wide default (`{ id?, label, icon?, route?, href?, payload? }`). An `href` or `route` action renders as a real link (an `href` opens in a new tab, a `route` is a router link), so it can be middle-clicked or opened in a new tab. On click it emits `primary-action` (and back-compat `primary-action-click`) before the link is followed. An action with neither only emits.

Nothing renders when neither is provided (backwards compatible). The `primaryAction` icon defaults to MDI `Plus` when `icon` is omitted (matches the `NcAppNavigationNew` default).

### Brand

A brand block can sit at the very top of the navigation, above the primary action: a logo, a name and a caption. Declare it in the manifest, or pass the `brand` prop, which wins:

```json
"nav": {
  "brand": {
    "logo": "/apps/thematiq/img/zuiddrecht-beeldmerk.svg",
    "name": "dossiq",
    "caption": "Gemeente Zuiddrecht"
  }
}
```

`name` and `caption` go through the translate function. The logo is decorative beside a name. A logo on its own takes `alt` as its alternative text. Use the `#brand` slot to draw the block yourself; it receives the resolved `brand`.

Nothing renders there when no brand is declared.

### `nav` block

Top-level manifest config for the navigation:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `nav.includePersonalSettings` | Boolean | `true` | Auto-prepend the "Personal settings" entry in the foldout. Set `false` for apps with no per-user settings dialog. |
| `nav.settingsLabel` | String | `'Settings'` | Override the foldout gear-button label. |
| `nav.primaryAction` | Object | — | App-wide default primary-action button above the main list: `{ id?, label, icon?, route?, href?, payload? }`. Overridden by `pages[].primaryAction` for the active route, and overridden by the `#primary-action` slot. |
| `nav.brand` | Object | none | Brand block at the top of the navigation: `{ logo?, name?, caption?, alt? }`. Overridden by the `brand` prop and by the `#brand` slot. |

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

### Accessibility: the navigation landmark's name

The rendered `<nav>` is an ARIA landmark, and a landmark with no accessible name
is announced as just "navigation" — indistinguishable from any other nav in the
landmark list a screen-reader user tabs through (WCAG 2.4.6 / 1.3.1).
`@nextcloud/vue` 9 enforces this: `NcAppNavigation` warns unless `ariaLabel` or
`ariaLabelledby` is set.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `ariaLabel` | String | `'Main navigation'` (translated) | Accessible name for the navigation landmark, forwarded to `NcAppNavigation`'s `aria-label`. |

The default covers every consumer with no code change. Pass your own when an app
renders more than one navigation — telling them apart is the entire purpose of
the name:

```vue
<CnAppNav :aria-label="t('myapp', 'Project navigation')" />
```

### Slots

| Slot | Description |
|------|-------------|
| `primary-action` | Replaces the manifest-driven primary-action button. Render an `NcAppNavigationNew` (or anything) with your own dynamic label and click handler. |
| `brand` | Replaces the brand block at the top of the navigation. Scope: `{ brand }`, the resolved `{ logo, name, caption, alt }` or null. |
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
| `translateLabel` | `boolean` | Default `true`. `false` renders `label` as written instead of passing it through `translate()`, for a user-authored title (a catalog name, say) that may equal a translation key such as `Search`. Applies to the entry's text and tooltip, on entries, children, captions, footer and settings entries. The label is always rendered as text, never as HTML |
| `icon` | `string` | CSS class (e.g. `icon-checkmark`); the active-state filter only applies to `class*="icon-"` |
| `route` | `string` | Vue Router named route. Resolved against `manifest.pages` for `exact` matching |
| `query` | `object` | Optional query merged into the link (`{ name: route, query }`), e.g. `{ "caseType": "<uuid>" }` to deep-link to a pre-filtered list. The entry is active only while the address carries every key, see [Active entry and `query`](#active-entry-and-query) |
| `params` | `object` | Optional route params for a parameterised route, string or number values. The link becomes `{ name: route, params, query }`, e.g. `{ "slug": "news" }` for a page at `/catalogs/:slug`. The entry is active only while every declared param equals the current route's param, see [Active entry and `params`](#active-entry-and-params) |
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
  "id": "view-in-launchpad",
  "label": "scholiq.nav.viewInLaunchpad",
  "href": "/index.php/apps/launchpad#scholiq",
  "visibleIf": { "appInstalled": "launchpad" }
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
  "href": "/apps/launchpad#scholiq",
  "visibleIf": {
    "appInstalled": "launchpad",
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
| `isOwner` | `Boolean` | `false` | Whether the current user OWNS this app — computed by `CnAppRoot` from `currentUserGroups` ∩ `permissions.owners`, and/or a manifest `runtime.user` owner signal; deliberately NOT `OC.isUserAdmin()`. A DIFFERENT signal from `isAdmin` ("administers this instance"); since ADR-079 it no longer gates the Admin settings entry. |
| `isAdmin` | `Boolean` | `false` | Whether the current user administers this Nextcloud instance — computed by `CnAppRoot` from `getCurrentUser()?.isAdmin` (`@nextcloud/auth`), never the legacy `OC.isUserAdmin()` global. Gates VISIBILITY of the auto-prepended "Admin settings" link to `/settings/admin/<appId>` (ADR-079). Presentation only — it is never an authorization decision; Nextcloud's settings framework refuses that page server-side for non-admins. Defaults to `false` so `CnAppNav` mounted standalone never shows the link. |
| `appId` | `String` | `null` | App id used to build the Admin-settings link target `/settings/admin/<appId>`. Falls back to the `cnAppId` provided by `CnAppRoot`; with neither available the link is suppressed rather than pointing at a broken URL. |
| `brand` | `Object \| null` | `null` | Brand block at the top of the navigation: `{ logo?, name?, caption?, alt? }`. Falls back to the manifest's `nav.brand`. With neither, nothing renders. |

## Behaviour

- **Active state** — an item is active when `$route.name === item.route`, narrowed by its `query` and `params` when it declares them (see below). On a page whose path sits below an item's page path, the item with the longest matching page path is active. External (`href`) items never appear active.
- **Exact matching** — when the resolved page's `route === '/'`, `exact` is set on the underlying router-link. Without this, the root item would look permanently active for nested routes.
- **External links** — `href` items return `null` for `:to` and render a real anchor, so middle-click and copy-link work. `NcAppNavigationItem` adds `target="_blank"` for external (`scheme://`) URLs.
- **Admin settings action** — an item with `action: "admin-settings"` renders as a real anchor to the absolute `/settings/admin/<appId>` URL, which opens in a new tab. Without a resolvable app id it has no href and the click does nothing.
- **User settings action** — items with `action: "user-settings"` return `null` for `:to`, intercept the click, and invoke the injected `cnOpenUserSettings()`. CnAppRoot provides this inject and toggles its hosted `NcAppSettingsDialog`. When CnAppNav is mounted standalone (no CnAppRoot ancestor), the inject defaults to a no-op so the click silently does nothing.
- **Group headers toggle on title click** — an item with no `route` / `href` / `action` but with visible `children[]` is a pure group header: its anchor would be a dead `#` link, so clicking the title toggles the children open/closed — the same effect as the collapse chevron. CnAppNav tracks this expand/collapse state locally (seeded from the manifest's `item.open`, kept in sync with chevron clicks via `update:open`), so both click targets always agree.
- **A group with its OWN route or href opens (never toggles) on title click** — when a `children[]`-bearing item also carries a `route` or `href`, its title click is a real navigation: `preventDefault()` is never called, so the router-link (or anchor) navigates natively, and the click additionally forces the group open — it never closes an already-open group this way. A reader who clicks the group's own page lands on it with its children already visible, instead of having to find the collapse chevron separately. The chevron remains the only control that can collapse such a group again.
- **Active icon colour** — `icon-*` background-image classes have a hardcoded dark fill, so the component injects `filter: brightness(0) invert(1)` to whiten them when active. `<template #icon>` MDI components inherit `currentColor` and don't need this.

## Active entry and `query`

Two entries may share a route and differ only in `query`, for example "My work" (`query: { "assignee": "me" }`) and "All cases" on the same list. An entry with a `query` is active only when the address carries every key of it. An entry without one is not active while a sibling's query matches. So one entry is marked, not two.

### On a page below a list

On a detail page under a list (`/cases/123` under `/cases`) the menu marks the list's entry, found by the longest matching path. The address there carries the detail page's query, not the list's. So when every entry on that list has a `query`, the rule above marks none of them. The menu then marks exactly one:

1. the entry the reader last had active on that list in this session, so "Queue" stays marked after opening a case from the queue;
2. otherwise, for example after a reload or a shared link, the first of those entries in menu order.

Use `order` to decide which entry that is. A list that has an entry without a `query` is not affected: that entry is marked below the list, as it was. On the list itself nothing changes either: an address no entry describes marks none.

## Active entry and `params`

Entries may share a parameterised route and differ in `params`, for example one entry per catalog, each routing to the same `/catalogs/:slug` page:

```json
{ "id": "catalog-news",  "label": "News",  "route": "Catalog", "params": { "slug": "news" },  "order": 10 },
{ "id": "catalog-sport", "label": "Sport", "route": "Catalog", "params": { "slug": "sport" }, "order": 11 }
```

An entry with `params` is active only while every declared key equals the current route's param of the same name. Values are compared as strings, so `{ "year": 2026 }` matches `/reports/2026`. Keys the route carries but the entry does not declare are ignored. An entry that declares both `params` and `query` needs both to match. Like `query`, an entry without `params` on the same route is not active while a sibling's `params` match. The router builds an entry's link from its `params` and fills any other required param of the target page from the current route, so an entry without `params` on a `/catalogs/:catalogSlug` page links fine from inside a catalog. If a required `:name` of the entry's manifest page is in neither (`{ "slug": "news" }`, or no `params` at all, on a route without `catalogSlug`), the entry still renders but without a link, clicking it does nothing, and the console warns once naming the entry and the missing param; the rest of the navigation is unaffected. This follows navigation: the same entry is linked again on a route that carries the param. Known limitation: an entry with only `params` does not step back for a sibling with the same `params` plus a matching `query`, so both are marked on that address.

An entry is also active on related pages below its own: with its `params` filled into its page path, any route whose path starts with that path counts. Path segments are compared decoded, so a value the router percent-encodes (`a b` as `a%20b`) still matches. A detail page at `/catalogs/:slug/:id` therefore marks the `sport` entry on `/catalogs/sport/42`, because that route carries `slug: "sport"` too. To mark an entry active on a related page, declare that page's route below the entry's page path, preferably with the same param names. A page below that names the param differently (`/catalogs/:catalog/:id`) fails the params check, and the menu falls back to marking one entry below the route, as for `query`, but only among entries whose filled-in path the address sits below. A page path with a required `:name` the entry has no param for is never matched this way, and an entry is never marked for a param value it does not declare.

## Dynamic per-tenant menu entries

The menu CnAppNav renders is whatever [`useAppManifest`](../utilities/composables/use-app-manifest.md) ultimately resolves to — including `menu[]` arrays (and nested `children[]`) supplied by the backend `/api/manifest` endpoint. Apps that need per-tenant menu fan-out (e.g. one entry per catalogue, organisation, or case type) populate the resolved entries in their backend; CnAppNav renders whatever the merged manifest contains. See [Overriding an app's manifest at runtime](../manifest-runtime-override.md) for the full feature — the endpoint contract, the `deepMerge` vs `delta` strategies, and how nested children merge by `id`.

## Related

- [CnAppRoot](./cn-app-root.md) — Provides the `manifest` / `translate` / `permissions` values via inject.
- [useAppManifest](../utilities/composables/use-app-manifest.md) — Loads, merges, and validates the manifest CnAppNav renders.
- [migrating-to-manifest](../migrating-to-manifest.md) — Adoption guide.

## Zuiddrecht additions (2.63.0, all opt-in)

### A primary action that runs a page action, or is drawn solid

`nav.primaryAction` and `pages[].primaryAction` take an `action` (the `$defs/action` shape). The button then renders through `CnActionButtons`, so an `open-form` action opens the schema-driven create dialog without a create page, `navigate` pushes a route and `api-call` calls an endpoint. It is drawn as one solid, full-width primary button; `solid: true` draws a plain or link action the same way. `permission` and `visibleIf` gate the action like a menu entry; a gated-out page-scoped action falls back to `nav.primaryAction`. After an `open-form` action saves, the nav emits `primary-action-created` with the created object.

```json
"nav": {
  "primaryAction": {
    "id": "new-case", "label": "New case", "icon": "Plus", "permission": "cases.create",
    "action": { "type": "open-form", "register": "dossiq", "schema": "case" }
  }
}
```

### A filtered count on an entry

`count` can be `{ register, schema, filter? }`: the total of that filtered list, fetched by `CnAppRoot` with the filter's tokens (`@me`, `@today`, ...) resolved and provided per entry id as `cnMenuItemCounts`, under its own request so the index page's whole-schema total stays what it was.

```json
{ "id": "mine", "label": "My work", "route": "Cases", "query": { "assignee": "me" },
  "count": { "register": "dossiq", "schema": "case", "filter": { "assignee": "@me", "status": { "neq": "closed" } } } }
```

### A card and a help entry

`nav.card` draws a card above the footer entries: a title, a line of text and one link (`route` + optional `params`, `href`, or an `action` id that emits `card-action`). The `#card` slot replaces it and receives the resolved `card`. `nav.help` adds a help entry with a help icon above the settings foldout (`route` or `href`, an href opens in a new tab).

```json
"nav": {
  "card": { "title": "Close out your day", "text": "See what is left and set it up for tomorrow.", "link": { "label": "To the day close", "route": "DayClose" } },
  "help": { "label": "Help and explanation", "href": "https://docs.example.org/dossiq" }
}
```

Theme hooks: `--cn-nav-card-background`, `--cn-nav-card-radius`.

### An emblem in the brand block

`nav.brand.emblem` draws an emblem in place of `logo`: the municipality's mark beside the app name, distinct from the wordmark in the top bar. A URL, or `true` to draw the theme's emblem from `--nldesign-emblem-url`. Size: `--cn-nav-emblem-size` (34px).

| Slot | Description |
|------|-------------|
| `card` | Replaces the card above the footer entries. Scope: `{ card }`, the resolved card or null. |

| Event | Payload | Description |
|-------|---------|-------------|
| `primary-action-created` | the created object | An `open-form` primary action saved. |
| `card-action` | the action id | The nav card's link is an action button and was clicked. |

## Zuiddrecht additions, round two (opt-in)

### A declared footer (`nav.footer`)

`nav.footer` is an ordered list of `section: "footer"` entry ids plus two reserved ids: `help` (the `nav.help` entry) and `settings` (the settings foldout). Only the named footer entries render in the footer, in that order. Footer entries left out move into the settings foldout, so a page such as Store or Reports stays reachable. `settings` first puts the foldout above the footer list, as the board draws "Instellingen" above "Hulp en uitleg". Without the key the footer renders as before: the help entry, every footer entry, then the foldout.

```json
"nav": {
  "settingsLabel": "Instellingen",
  "help": { "label": "Hulp en uitleg", "href": "https://dossiq.conduction.nl" },
  "footer": ["settings", "help"]
}
```

The primary action is never clipped: the navigation body that holds it keeps its height when a card and footer entries make the column overflow.
