# CnAppRoot

Top-level wrapper for manifest-driven Conduction apps. Provides the manifest, custom-component registry, page-type registry, and translate function to descendants via `provide` / `inject`. Orchestrates three rendering phases: **loading** → **dependency-check** → **shell**.

CnAppRoot is the full-shell convenience for the JSON manifest renderer. Apps that want manifest-driven pages but their own root layout can skip CnAppRoot and use [`CnPageRenderer`](./cn-page-renderer.md) / [`CnAppNav`](./cn-app-nav.md) directly with explicit props.

**Wraps**: `NcContent`, `NcAppContent`, [`CnAppLoading`](./cn-app-loading.md), [`CnDependencyMissing`](./cn-dependency-missing.md), [`CnAppNav`](./cn-app-nav.md)

## Phases

| Phase | When | Default rendering | Override slot |
|-------|------|-------------------|---------------|
| `loading` | While `isLoading` is `true` | `<CnAppLoading />` | `#loading` |
| `dependency-missing` | After loading; an unresolved **HARD** dependency in `manifest.dependencies` | `<CnDependencyMissing />` | `#dependency-missing` |
| `shell` | Manifest loaded + all HARD dependencies satisfied | `<CnAppNav />` + default slot content | `#menu`, default slot, `#header-actions`, `#sidebar`, `#footer` |

Dependency status is resolved by [`useAppStatus`](../utilities/composables/use-app-status.md) — one call per id in `manifest.dependencies`, cached for the page lifetime.

## HARD vs SOFT dependencies

Each entry in `manifest.dependencies` is either a **string** (a HARD dependency — the app cannot run without it) or an **object** `{ id, required?, name? }` where `required: false` marks a **SOFT** (optional) integration. `required` defaults to `true`, so existing string-only manifests behave exactly as before.

```jsonc
"dependencies": [
  "openregister",                              // HARD: blocks the shell when missing
  { "id": "deck", "required": false, "name": "Deck" }  // SOFT: dismissible in-shell notice
]
```

| | Unresolved behaviour |
|---|---|
| **HARD** (string, or `required` not `false`) | Blocks the shell — phase `dependency-missing`, `<CnDependencyMissing>` full-page screen. |
| **SOFT** (`required: false`) | Never blocks. Renders a dismissible `NcNoteCard` banner inside the shell carrying the same install/enable action. Dismissal persists per app+dependency under `localStorage` key `cn-soft-dep-dismissed:{appId}:{depId}`. |

### In-place install / enable

Both dependency surfaces (`CnDependencyMissing` and the `or-missing` guard) and every soft-dependency banner render an admin-aware action driven by [`useAppInstaller`](../utilities/composables/use-app-installer.md): an admin clicks **Install and enable** (not installed) or **Enable** (installed but disabled) and nc-vue downloads, installs and enables the app via Nextcloud's install endpoint — the NC34+ bundled-`appstore` OCS API, falling back to the legacy `settings/apps/enable` route on ≤NC33 — then reloads. Non-admins — who cannot hit that admin-only endpoint — see "ask your administrator to enable {name}" copy instead of a dead-end link. On failure the error shows inline and the original store link stays as a fallback.

When no server-side `dependency_statuses` initial-state is present and the JS heuristic cannot distinguish "not installed" from "installed but disabled", the action defaults to the **Install and enable** label — a genuinely-missing app must never be mislabelled **Enable**.

The `or-missing` guard (the capabilities check driven by the `requiresApps` prop) now renders English default copy for the `app-availability.title` / `app-availability.description` / `app-availability.action` keys when the `translate` prop leaves them unchanged, so the raw keys never render.

## Usage

```vue {static}
<template>
  <CnAppRoot
    :manifest="manifest"
    app-id="decidesk"
    :is-loading="isLoading"
    :custom-components="customComponents"
    :page-types="pageTypes"
    :translate="translate"
    :permissions="permissions">

    <!-- Optional overrides -->
    <template #loading>
      <MyBrandedLoadingScreen />
    </template>
  </CnAppRoot>
</template>

<script>
import { CnAppRoot, useAppManifest, defaultPageTypes } from '@conduction/nextcloud-vue'
import bundledManifest from './manifest.json'
import MyReportPage from './views/MyReportPage.vue'

export default {
  components: { CnAppRoot },
  setup() {
    const { manifest, isLoading } = useAppManifest('decidesk', bundledManifest)
    return {
      manifest,
      isLoading,
      customComponents: { /* keys referenced by page.component for type:"custom" pages */ },
      pageTypes: { ...defaultPageTypes, report: MyReportPage },
      translate: (key) => t('decidesk', key),
      permissions: ['decisions.read', 'decisions.write'],
    }
  },
}
</script>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `manifest` | `Object` | — (required) | Reactive manifest. The renderer reads `manifest.dependencies` and `manifest.menu`; descendants `inject('cnManifest')`. |
| `appId` | `String` | — (required) | Nextcloud app id. Forwarded to `NcContent` as `app-name` and to `CnDependencyMissing`. |
| `appDisplayName` (`app-display-name`) | `String` | `''` | Human-readable name shown in the Nextcloud top bar. When set it overrides the technical `appId` so a virtual app shows its own name (e.g. "Pet Store") instead of the host app id. |
| `persistManifestDelta` | `Function` | `null` | Optional persistence hook for in-app editing (ADR-041). Called with the minimal manifest delta when the user saves an edit. When omitted, Save updates the rendered manifest in memory but persists nothing — wire it to the OpenBuild app-override endpoint to make edits durable. When OpenBuild is reachable for the user, CnAppRoot surfaces a Conduction-orange edit button (`CnOpenBuildEditButton`) top-right of the content and provides a shared `cnManifestEditor`; the body grid becomes drag/resizable in edit mode. Emits `@manifest-save(delta)`. |
| `dataSources` | `Object \| null` | `null` | App registers/schemas for the in-app pages editor (ADR-041). Lets the Edit-pages modal offer Register / Schema / Columns dropdowns for `index`/`detail` pages instead of free-text slug inputs, so a created page actually renders a table. Shape: `{ registers: [{ value, label, schemas: [{ value, label, columns: string[] }] }] }`. Provided to descendants as `cnDataSources`; when omitted the editor falls back to free-text register/schema fields. **A snapshot** — captured once, so it cannot show anything created after boot. Prefer `dataSourcesLoader`. |
| `dataSourcesLoader` (`data-sources-loader`) | `Function \| null` | `null` | Async loader for the same data, re-invoked every time a pages-editor modal opens: `async () => ({ registers: [...] })`. Because `provide()` runs once, the static `dataSources` snapshot can never change — so a register or schema created after the app booted (in another tab, the OpenRegister UI, or via the API) would never appear in the dropdowns. A loader fixes that with no page reload, and moves the fetch off the app-boot path onto the far rarer editor-open path. When both props are given, `dataSources` seeds the initial list and the loader's result replaces it on the first refresh. |
| `routerViewKey` (`router-view-key`) | `String \| Number` | `'cn-router-view'` | Remount key for the routed `<router-view>`. Hosts that rebuild the router at runtime (e.g. the OpenBuild builder adding a page mid-edit) bump this **after** the rebuild so the view drops its stale component-instance cache and mounts the new routes — a Vue Router 3 matcher swap alone resolves the new hrefs but leaves SPA-navigation to a just-added route rendering a blank view. Keep the default for static apps: the key is stable across ordinary navigation, so the view is never needlessly remounted (and the shell / teleported modals are untouched). |
| `isLoading` | `Boolean` | `false` | Wire to `useAppManifest().isLoading`. Apps using only the bundled manifest skip the loading phase. |
| `customComponents` | `Object` | `{}` | Registry consumed by `CnPageRenderer` for `type: "custom"` pages and slot overrides. Provided as `cnCustomComponents`. |
| `formatters` | `Object` | `{}` | Cell-formatter registry — map of formatter-id → `(value, row, property) => string\|number`. Resolves the `pages[].config.columns[].formatter` ids that `index` / `logs` pages declare, so per-column value formatting lives in small pure data functions instead of bespoke `type:"custom"` table views. Provided to descendant `CnDataTable` / `CnCellRenderer` as `cnFormatters`. See [migrating-to-manifest → Column formatters](../migrating-to-manifest.md#column-formatters). |
| `cellWidgets` | `Object` | `{}` | Cell-widget registry — map of widget-id → Vue component, rendered for a column that declares `pages[].config.columns[].widget`. The component receives `{ value, row, property, formatted, ...widgetProps }`. The library ships one built-in id, `"badge"` (renders `CnStatusBadge`); consumer entries cover everything else (status pills, inline toggles, link cells, …). Provided to descendant `CnDataTable` / `CnCellRenderer` as `cnCellWidgets`. See [migrating-to-manifest → Column widgets](../migrating-to-manifest.md#column-widgets). |
| `kbSearchProviders` | `Object` | `{}` | Pluggable knowledge-base search providers (#91 Wave 3) — map of provider-key → `{ search(query, opts), externalOpen? }`, merged OVER the library built-in `default` (endpoint) provider and provided to descendant `CnKbSearchWidget` as `cnKbSearchProviders`. A `kb-search` widget picks its provider via `content.provider`; an app talking to a bespoke KB backend (the xwiki proxy) registers its client here — the library ships only the seam. See [CnActionButtons / kb-search](./cn-kb-search-widget.md). |
| `pageTypes` | `Object \| null` | `null` | Map of `pages[].type` → Vue component. Provided to descendant renderers as `cnPageTypes`. When omitted, the renderer falls back to `defaultPageTypes`. |
| `translate` | `Function` | identity | App-supplied translator — typically `(key) => t(appId, key)`. Named `translate` (not `t`) to avoid shadowing the global `t()` mixin. Provided as `cnTranslate`. |
| `permissions` | `Array<string>` | `[]` | Permission strings the current user holds. Forwarded to `CnAppNav` for menu filtering. |
| `userSettingsTitle` | `String` | `''` | Title shown at the top of the hosted `NcAppSettingsDialog`. Empty (the default) resolves to `translate('User settings')` so the title follows the user's locale. Override per app to brand the modal (e.g. `'Decidesk preferences'`). |
| `adminSettingsTitle` | `String` | `''` | Title shown at the top of the admin-settings `NcAppSettingsDialog`. Empty (the default) resolves to `translate('Administration')`. Override per app (e.g. `'Pipelinq administration'`). |
| `requiresApps` | `Array<string>` | `['openregister']` | App ids that MUST be installed for the host app to function. Checked against the OCS capabilities API on mount. When any required app is missing, CnAppRoot renders the `or-missing` slot (default `<NcEmptyContent>`) instead of the renderer. Pass `[]` to opt out (e.g. launchpad, the docs/styleguide app). See [App-availability guard](../architecture/schemas-and-registers.md#app-availability-guard-opt-out). |
| `initialOrganisationUuid` | `String \| null` | `null` | Seed value for the multi-tenancy provider's `activeOrganisationUuid`. CnAppRoot calls [`provideTenantContext`](../utilities/provide-tenant-context.md)`(initialOrganisationUuid, initialOrganisation)` on mount, so consumers wired to [`useTenantContext`](../utilities/composables/use-tenant-context.md) see the seeded tenant from the first render. Single-tenant deployments leave both props `null`. |
| `initialOrganisation` | `Object \| null` | `null` | Optional resolved organisation entity matching `initialOrganisationUuid`. Stored on `activeOrganisation` so downstream components ([`CnTenantBadge`](./cn-tenant-badge.md), [`CnFormDialog`](./cn-form-dialog.md) auto-fill) have the name/icon available immediately without a follow-up fetch. |
| `chatAppId` | `String` | `'openregister'` | Backend app id the hosted [`CnAiCompanion`](./cn-ai-companion.md) targets for its chat/agent HTTP calls (see [`chatApiBase`](../utilities/chat-api-base.md) / [`DEFAULT_CHAT_APP_ID`](../utilities/default-chat-app-id.md)). Override (e.g. `'hermiq'`) to point the companion at another backend. |

## Provided values

CnAppRoot calls `provide()` with the following keys; descendants `inject` these:

| Inject key | Provided value |
|------------|----------------|
| `cnManifest` | The `manifest` prop |
| `cnCustomComponents` | The `customComponents` prop |
| `cnTranslate` | The `translate` prop |
| `cnPageTypes` | The `pageTypes` prop |
| `cnOpenUserSettings` | Function that opens the hosted `NcAppSettingsDialog`. CnAppNav binds this to manifest entries with `action: "user-settings"`; consumer apps can also invoke it directly via inject for custom triggers (e.g. an avatar-menu entry). |
| `cnAppId` | The consuming app's slug (mirrors the `appId` prop, e.g. `"pipelinq"`). Read by [`CnWidgetWrapper`](./cn-widget-wrapper.md)'s built-in **Request a feature** default to pre-fill `CnSuggestFeatureModal`'s `app` prop — apps don't have to wire it per-widget. |
| `cnFeatureRequestRepo` | Target repo slug for the in-product feature-request deep link (e.g. `"Conduction/pipelinq"`). Read from `manifest.nav.featureRequestRepo` when set; otherwise falls back to `Conduction/<appId>` (the convention for every Conduction app on Codeberg). Used by `CnWidgetWrapper`'s built-in **Request a feature** default. |
| `cnFeatureRequestForge` | Forge config `{ type, baseUrl }` for the feature-request deep link. Read from `manifest.nav.forge` (merged over the Codeberg default). Switching the fleet's forge — back to GitHub, or onto a self-hosted Forgejo/Gitea — is just this one manifest field. Consumed by `CnActionsMenu` / `CnSuggestFeatureModal`. |
| `cnMenuCounts` | Reactive `{ [register]: { [schema]: number } }` map of `useObjectStore` totals. Populated at mount for every `menu[].count: "auto"` entry whose resolved page is `type: "index"` with `register + schema` in its `config`. Read by [`CnAppNav`](./cn-app-nav.md) inside `resolveCount()` to render `NcCounterBubble` badges. One `?_limit=1` fetch per unique `(register, schema)` pair; failures degrade silently to "no badge" so a broken endpoint never blanks the navigation. |
| `cnDataSources` | The `dataSources` prop, as passed. A plain value captured once — kept for backwards compatibility; prefer `cnDataSourcesState` below. |
| `cnDataSourcesState` | Live data-source holder: `{ value, loading, error, hasLoader }`, where `value` is the `{ registers: [...] }` payload. **Provided by reference and mutated in place** — its identity never changes, which is what lets the one-shot `provide()` see every update. Descendants resolve `cnDataSourcesState.value ?? cnDataSources`, so a host passing only the legacy snapshot still works. |
| `cnRefreshDataSources` | `async () => void` — re-runs `dataSourcesLoader` and updates the holder. Called by the pages-editor modals on open; a no-op when no loader is configured. Concurrent calls share one in-flight fetch, and a failure keeps the last good list while recording `error`. |

## Slots

| Slot | Scope | Default | Description |
|------|-------|---------|-------------|
| *(default)* | — | — | Page content area inside `NcAppContent`. In real apps, pass `<router-view />` here. |
| `loading` | — | `<CnAppLoading />` | Shown during the loading phase |
| `dependency-missing` | `{ dependencies }` | `<CnDependencyMissing :dependencies />` | Shown when any dependency is missing or disabled |
| `or-missing` | `{ missingApps }` | Default `<NcEmptyContent>` linking to the OpenRegister app-store integration page | Shown when any app in `requiresApps` is missing per the OCS capabilities check. Override to fully replace the empty state. |
| `menu` | — | `<CnAppNav :permissions />` | Replaces the default app navigation |
| `header-actions` | — | — | Mounted inside `NcAppContent`, alongside the default slot |
| `sidebar` | — | The resolved `cnPageSidebarComponent` when set, otherwise empty | Mounted next to `NcAppContent` (e.g. for `NcAppSidebar`). Gated by the `cnPageSidebarVisible` inject — when a descendant `CnPageRenderer` flips it to `false` (because the current manifest page declares `sidebar.show: false`), this slot stops rendering. The default (no provider) is value-true so the slot keeps rendering. The slot's **default content** is driven by the `cnPageSidebarComponent` inject — when the current page declares a `sidebarComponent` registry name, the resolved component renders here unless the consumer supplies a `#sidebar` slot override (override wins). See [Per-page sidebar visibility](./cn-page-renderer.md#per-page-sidebar-visibility) and [Per-page sidebar component](./cn-page-renderer.md#per-page-sidebar-component). |
| `footer` | — | — | Mounted inside `NcAppContent`, after the default slot |
| `user-settings` | — | Notification preferences, plus a "Restart walkthrough" section when the manifest declares an enabled tour | `NcAppSettingsSection` children rendered inside the host `NcAppSettingsDialog`. The dialog is always mounted; CnAppNav opens it via `cnOpenUserSettings` (manifest items with `action: "user-settings"`). Supplying this slot replaces the default content (including the walkthrough section). |

## User-settings modal

CnAppRoot always mounts a single `NcAppSettingsDialog` and exposes a `cnOpenUserSettings` provide-injected method any descendant can call to open it. The default trigger is [CnAppNav](./cn-app-nav.md) — manifest entries declaring `action: "user-settings"` are wired to this method automatically.

```vue {static}
<CnAppRoot :manifest="manifest" app-id="decidesk">
  <template #user-settings>
    <NcAppSettingsSection id="general" :name="t('decidesk', 'General')">
      <p>{{ t('decidesk', 'Personal preferences for Decidesk.') }}</p>
    </NcAppSettingsSection>
    <NcAppSettingsSection id="notifications" :name="t('decidesk', 'Notifications')">
      <!-- toggles, selects, etc. -->
    </NcAppSettingsSection>
  </template>
</CnAppRoot>
```

When no `#user-settings` slot is supplied, the modal renders the built-in notification-preferences pane. If the app's manifest declares an enabled `walkthrough` with at least one tour (ADR-043), a **Walkthrough** section is appended with a **Restart walkthrough** button — a self-service way to re-run the product tour. Clicking it closes the settings dialog and re-fires the tour from step 1. The section is strictly gated on `walkthroughEnabled`, so apps without a walkthrough never show it. Supplying your own `#user-settings` slot replaces this default content entirely.

## Hoisted index sidebar

`CnAppRoot` provides a reactive holder, `cnIndexSidebarConfig`, that descendants — specifically [`CnIndexPage`](./cn-index-page.md) — write to in order to mount their embedded `CnIndexSidebar` at NcContent level. NcAppSidebar **must** be a direct child of NcContent to render as the proper right-side overlay; nested anywhere deeper it falls back to in-flow layout, which is why the lib hoists.

The hoist is automatic — apps using `CnAppRoot` get correct positioning the moment they pass a `sidebar: { enabled: true }` config on a `type: 'index'` manifest page. No consumer template changes required. The hoisted sidebar mounts as a sibling of the consumer's `#sidebar` slot, so existing `#sidebar` content (e.g. `CnObjectSidebar` for detail pages) keeps working unchanged.

Apps mounting `CnIndexPage` standalone (without `CnAppRoot`) keep the legacy inline rendering — the `cnHostsIndexSidebar` sentinel defaults to `false` in that case, so `CnIndexPage` renders the sidebar in-tree as before.

## Hoisted object sidebar (detail pages)

`CnAppRoot` also provides an `objectSidebarState` holder that
[`CnDetailPage`](./cn-detail-page.md) writes into via
`syncSidebarState()` — `{ active, objectType, objectId, register,
schema, title, subtitle, tabs, hiddenTabs, ... }`. When a detail page
is active and provides an `objectType` + `objectId`, CnAppRoot
auto-mounts `CnObjectSidebar` at NcContent level with those props.
ADR-017 again: NcAppSidebar must be a direct child of NcContent to
position correctly.

The auto-mount defers when:

- the consumer supplies a `#sidebar` slot (their slot keeps owning
  the rail);
- an ancestor already provides `objectSidebarState` (the ancestor
  renders its own sidebar — e.g. decidesk's host wrapper); or
- `objectType` + `objectId` are empty (defense-in-depth against
  CnIndexPage's `inject('sidebarState') ?? inject('objectSidebarState')`
  fallback writing `active: true` into the wrong channel).

CnAppRoot also exposes a dedicated `sidebarState` holder for the
index-sidebar channel. The two reactive holders are distinct
references so index-page writes never leak into the object-sidebar
auto-mount (the openbuilt double-sidebar regression).

## Mounting virtual apps with an in-memory manifest

Most CnAppRoot consumers ship a static `manifest.json` and let `useAppManifest('myapp', bundled)` fetch the optional `/index.php/apps/myapp/api/manifest` override. Some consumers — notably the OpenBuilt app builder — render **virtual apps** whose manifest is constructed in memory at runtime, with no static file and no backend route.

For those hosts, `useAppManifest` now exposes a direct in-memory overload that mounts the manifest synchronously without any HTTP IO:

```js
import { CnAppRoot, useAppManifest } from '@conduction/nextcloud-vue'

setup() {
  const builderManifest = buildManifestFromStore()
  const { manifest, isLoading } = useAppManifest({ manifest: builderManifest })
  return { manifest, isLoading }
}
```

The composable returns the same `{ manifest, isLoading, validationErrors, unresolvedSentinels }` shape as the legacy positional signature, so `CnAppRoot` consumes it unchanged. `isLoading.value` is `false` immediately because no fetch is queued. See [`useAppManifest` — Mounting an in-memory manifest](../utilities/composables/use-app-manifest.md#mounting-an-in-memory-manifest) for the full overload contract and the optional `validate: true` flag.

### Historical workaround

Before this overload existed, virtual-app hosts had to fake an HTTP fetch by passing a stub `options.endpoint` and an `options.fetcher` that resolved synchronously to the in-memory manifest. That workaround is documented in the OpenBuilt `bootstrap-openbuilt` change (Decision 4) and is now historical — the in-memory overload is the supported path. The legacy `options.endpoint` / `options.fetcher` parameters remain fully supported for their intended uses (tests, alternative-host deployments).

## Related

- [useAppManifest](../utilities/composables/use-app-manifest.md) — Loads/validates the manifest passed in.
- [useAppStatus](../utilities/composables/use-app-status.md) — Backs the dependency-check phase.
- [CnPageRenderer](./cn-page-renderer.md) — Mounts inside `<router-view>` to dispatch by page type.
- [CnAppNav](./cn-app-nav.md) — Default `#menu` rendering.
- [defaultPageTypes](../utilities/default-page-types.md) — Built-in page-type registry.
- [validateManifest](../utilities/validate-manifest.md) — The validator used inside `useAppManifest`.
- [migrating-to-manifest](../migrating-to-manifest.md) — Tier-by-tier adoption guide.

## Support dialog

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `supportDialog` | Boolean \| Object | `true` | Auto-mount the built-in support/feedback dialog. Pass `false` to disable, or an options object to configure it. |

## AI companion

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `aiCompanion` (`ai-companion`) | Boolean | `false` | Opt-in floating AI-chat companion (`CnAiCompanion`). Off by default; pass `true` to mount it. When enabled it still self-gates on its own backend health probe and hides on chat pages. The companion is an AI capability provided by the Hermiq app — apps opt in explicitly rather than every app auto-mounting it whenever a chat backend is reachable. |
| `commandPalette` (`command-palette`) | Boolean \| Object | `false` | Opt-in Ctrl/Cmd+K command palette (`CnCommandPalette`, see its own doc page). Off by default; pass `true` for zero-config navigation + registered actions, or an object to override any `CnCommandPalette` prop (most commonly `{ objectSearch: createObjectSearchSource({...}) }` to wire live OpenRegister search). |
