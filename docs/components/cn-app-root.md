# CnAppRoot

Top-level wrapper for manifest-driven Conduction apps. Provides the manifest, custom-component registry, page-type registry, and translate function to descendants via `provide` / `inject`. Orchestrates three rendering phases: **loading** → **dependency-check** → **shell**.

CnAppRoot is the full-shell convenience for the JSON manifest renderer. Apps that want manifest-driven pages but their own root layout can skip CnAppRoot and use [`CnPageRenderer`](./cn-page-renderer.md) / [`CnAppNav`](./cn-app-nav.md) directly with explicit props.

**Wraps**: `NcContent`, `NcAppContent`, [`CnAppLoading`](./cn-app-loading.md), [`CnDependencyMissing`](./cn-dependency-missing.md), [`CnAppNav`](./cn-app-nav.md)

## Phases

| Phase | When | Default rendering | Override slot |
|-------|------|-------------------|---------------|
| `loading` | While `isLoading` is `true` | `<CnAppLoading />` | `#loading` |
| `dependency-missing` | After loading; any entry in `manifest.dependencies` is not installed/enabled | `<CnDependencyMissing />` | `#dependency-missing` |
| `shell` | Manifest loaded + dependencies satisfied | `<CnAppNav />` + default slot content | `#menu`, default slot, `#header-actions`, `#sidebar`, `#footer` |

Dependency status is resolved by [`useAppStatus`](../utilities/composables/use-app-status.md) — one call per id in `manifest.dependencies`, cached for the page lifetime.

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
| `appDisplayName` | `String` | `''` | Human-readable name shown in the Nextcloud top bar. When set it overrides the technical `appId` so a virtual app shows its own name (e.g. "Pet Store"). |
| `persistManifestDelta` | `Function` | `null` | Optional persistence hook for in-app editing (ADR-041). Called with the minimal manifest delta when the user saves an edit. When omitted, Save updates the rendered manifest in memory but persists nothing — wire it to the OpenBuild app-override endpoint to make edits durable. When OpenBuild is reachable for the user, CnAppRoot surfaces a Conduction-orange edit button (`CnOpenBuildEditButton`) top-right of the content and provides a shared `cnManifestEditor`; the body grid becomes drag/resizable in edit mode. Emits `@manifest-save(delta)`. |
| `dataSources` | `Object \| null` | `null` | App registers/schemas for the in-app pages editor (ADR-041). Lets the Edit-pages modal offer Register / Schema / Columns dropdowns for `index`/`detail` pages instead of free-text slug inputs, so a created page actually renders a table. Shape: `{ registers: [{ value, label, schemas: [{ value, label, columns: string[] }] }] }`. Provided to descendants as `cnDataSources`; when omitted the editor falls back to free-text register/schema fields. |
| `isLoading` | `Boolean` | `false` | Wire to `useAppManifest().isLoading`. Apps using only the bundled manifest skip the loading phase. |
| `customComponents` | `Object` | `{}` | Registry consumed by `CnPageRenderer` for `type: "custom"` pages and slot overrides. Provided as `cnCustomComponents`. |
| `formatters` | `Object` | `{}` | Cell-formatter registry — map of formatter-id → `(value, row, property) => string\|number`. Resolves the `pages[].config.columns[].formatter` ids that `index` / `logs` pages declare, so per-column value formatting lives in small pure data functions instead of bespoke `type:"custom"` table views. Provided to descendant `CnDataTable` / `CnCellRenderer` as `cnFormatters`. See [migrating-to-manifest → Column formatters](../migrating-to-manifest.md#column-formatters). |
| `cellWidgets` | `Object` | `{}` | Cell-widget registry — map of widget-id → Vue component, rendered for a column that declares `pages[].config.columns[].widget`. The component receives `{ value, row, property, formatted, ...widgetProps }`. The library ships one built-in id, `"badge"` (renders `CnStatusBadge`); consumer entries cover everything else (status pills, inline toggles, link cells, …). Provided to descendant `CnDataTable` / `CnCellRenderer` as `cnCellWidgets`. See [migrating-to-manifest → Column widgets](../migrating-to-manifest.md#column-widgets). |
| `pageTypes` | `Object \| null` | `null` | Map of `pages[].type` → Vue component. Provided to descendant renderers as `cnPageTypes`. When omitted, the renderer falls back to `defaultPageTypes`. |
| `translate` | `Function` | identity | App-supplied translator — typically `(key) => t(appId, key)`. Named `translate` (not `t`) to avoid shadowing the global `t()` mixin. Provided as `cnTranslate`. |
| `permissions` | `Array<string>` | `[]` | Permission strings the current user holds. Forwarded to `CnAppNav` for menu filtering. |
| `userSettingsTitle` | `String` | `''` | Title shown at the top of the hosted `NcAppSettingsDialog`. Empty (the default) resolves to `translate('User settings')` so the title follows the user's locale. Override per app to brand the modal (e.g. `'Decidesk preferences'`). |
| `requiresApps` | `Array<string>` | `['openregister']` | App ids that MUST be installed for the host app to function. Checked against the OCS capabilities API on mount. When any required app is missing, CnAppRoot renders the `or-missing` slot (default `<NcEmptyContent>`) instead of the renderer. Pass `[]` to opt out (e.g. mydash, the docs/styleguide app). See [App-availability guard](../architecture/schemas-and-registers.md#app-availability-guard-opt-out). |
| `initialOrganisationUuid` | `String \| null` | `null` | Seed value for the multi-tenancy provider's `activeOrganisationUuid`. CnAppRoot calls [`provideTenantContext`](../utilities/provide-tenant-context.md)`(initialOrganisationUuid, initialOrganisation)` on mount, so consumers wired to [`useTenantContext`](../utilities/composables/use-tenant-context.md) see the seeded tenant from the first render. Single-tenant deployments leave both props `null`. |
| `initialOrganisation` | `Object \| null` | `null` | Optional resolved organisation entity matching `initialOrganisationUuid`. Stored on `activeOrganisation` so downstream components ([`CnTenantBadge`](./cn-tenant-badge.md), [`CnFormDialog`](./cn-form-dialog.md) auto-fill) have the name/icon available immediately without a follow-up fetch. |

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
