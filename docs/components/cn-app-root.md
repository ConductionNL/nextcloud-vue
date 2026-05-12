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
| `isLoading` | `Boolean` | `false` | Wire to `useAppManifest().isLoading`. Apps using only the bundled manifest skip the loading phase. |
| `customComponents` | `Object` | `{}` | Registry consumed by `CnPageRenderer` for `type: "custom"` pages and slot overrides. Provided as `cnCustomComponents`. |
| `formatters` | `Object` | `{}` | Cell-formatter registry — map of formatter-id → `(value, row, property) => string\|number`. Resolves the `pages[].config.columns[].formatter` ids that `index` / `logs` pages declare, so per-column value formatting lives in small pure data functions instead of bespoke `type:"custom"` table views. Provided to descendant `CnDataTable` / `CnCellRenderer` as `cnFormatters`. See [migrating-to-manifest → Column formatters](../migrating-to-manifest.md#column-formatters). |
| `pageTypes` | `Object \| null` | `null` | Map of `pages[].type` → Vue component. Provided to descendant renderers as `cnPageTypes`. When omitted, the renderer falls back to `defaultPageTypes`. |
| `translate` | `Function` | identity | App-supplied translator — typically `(key) => t(appId, key)`. Named `translate` (not `t`) to avoid shadowing the global `t()` mixin. Provided as `cnTranslate`. |
| `permissions` | `Array<string>` | `[]` | Permission strings the current user holds. Forwarded to `CnAppNav` for menu filtering. |
| `userSettingsTitle` | `String` | `''` | Title shown at the top of the hosted `NcAppSettingsDialog`. Empty (the default) resolves to `translate('User settings')` so the title follows the user's locale. Override per app to brand the modal (e.g. `'Decidesk preferences'`). |
| `requiresApps` | `Array<string>` | `['openregister']` | App ids that MUST be installed for the host app to function. Checked against the OCS capabilities API on mount. When any required app is missing, CnAppRoot renders the `or-missing` slot (default `<NcEmptyContent>`) instead of the renderer. Pass `[]` to opt out (e.g. mydash, the docs/styleguide app). See [App-availability guard](../architecture/schemas-and-registers.md#app-availability-guard-opt-out). |

## Provided values

CnAppRoot calls `provide()` with the following keys; descendants `inject` these:

| Inject key | Provided value |
|------------|----------------|
| `cnManifest` | The `manifest` prop |
| `cnCustomComponents` | The `customComponents` prop |
| `cnTranslate` | The `translate` prop |
| `cnPageTypes` | The `pageTypes` prop |
| `cnOpenUserSettings` | Function that opens the hosted `NcAppSettingsDialog`. CnAppNav binds this to manifest entries with `action: "user-settings"`; consumer apps can also invoke it directly via inject for custom triggers (e.g. an avatar-menu entry). |

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
| `user-settings` | — | Single placeholder section ("User preferences will appear here.") | `NcAppSettingsSection` children rendered inside the host `NcAppSettingsDialog`. The dialog is always mounted; CnAppNav opens it via `cnOpenUserSettings` (manifest items with `action: "user-settings"`). |

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

The slot defaults to a single placeholder section ("User preferences will appear here.") so the modal always has visible content while apps roll out their own preference UI.

## Hoisted index sidebar

`CnAppRoot` provides a reactive holder, `cnIndexSidebarConfig`, that descendants — specifically [`CnIndexPage`](./cn-index-page.md) — write to in order to mount their embedded `CnIndexSidebar` at NcContent level. NcAppSidebar **must** be a direct child of NcContent to render as the proper right-side overlay; nested anywhere deeper it falls back to in-flow layout, which is why the lib hoists.

The hoist is automatic — apps using `CnAppRoot` get correct positioning the moment they pass a `sidebar: { enabled: true }` config on a `type: 'index'` manifest page. No consumer template changes required. The hoisted sidebar mounts as a sibling of the consumer's `#sidebar` slot, so existing `#sidebar` content (e.g. `CnObjectSidebar` for detail pages) keeps working unchanged.

Apps mounting `CnIndexPage` standalone (without `CnAppRoot`) keep the legacy inline rendering — the `cnHostsIndexSidebar` sentinel defaults to `false` in that case, so `CnIndexPage` renders the sidebar in-tree as before.

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
