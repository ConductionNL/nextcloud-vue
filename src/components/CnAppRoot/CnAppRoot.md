CnAppRoot is the top-level manifest-driven app shell. It orchestrates three phases: loading → dependency check → shell. In a real app it wraps the entire Nextcloud content area.

The component requires a router, Nextcloud globals, and a live capabilities API for dependency checking — it is best demonstrated in a running Nextcloud environment. See `docs/components/cn-app-root.md` and `docs/migrating-to-manifest.md` for full usage.

Minimal conceptual shell (illustrative, not fully runnable in the styleguide):

```vue
<template>
  <CnAppRoot :app-id="'myapp'" :manifest="manifest">
    <template #menu>
      <!-- CnAppNav is injected automatically; override here for custom nav -->
    </template>
    <div style="padding: 1rem; color: var(--color-text-light);">
      <!-- router-view renders page content here in a real app -->
    </div>
  </CnAppRoot>
</template>
<script>
export default {
  data() {
    return {
      manifest: {
        version: '1.0.0',
        dependencies: [],
        menu: [
          { id: 'index', label: 'Home', icon: 'icon-home', route: 'index', order: 1 },
        ],
        pages: [],
      },
    }
  },
}
</script>
```

With loading state, custom components, translate, permissions, and custom page types:

```vue {static}
<template>
  <CnAppRoot
    app-id="myapp"
    :manifest="manifest"
    :is-loading="isLoading"
    :custom-components="{ SettingsPage, DashboardPage }"
    :translate="(key) => t('myapp', key)"
    :permissions="currentUser.permissions"
    :page-types="{ ...defaultPageTypes, report: ReportPage }">
    <template #loading>
      <MyBrandedLoader />
    </template>
    <template #dependency-missing="{ dependencies }">
      <MyDependencyScreen :missing="dependencies" />
    </template>
    <template #sidebar>
      <NcAppSidebar v-if="sidebarOpen" />
    </template>
    <template #footer>
      <AppFooter />
    </template>
  </CnAppRoot>
</template>
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `manifest` | Object | Yes | — | Reactive manifest object from `useAppManifest`. Provides `manifest.dependencies`, `manifest.menu`, and is propagated via provide/inject |
| `appId` | String | Yes | — | Nextcloud app id. Forwarded to `NcContent` and `CnDependencyMissing` |
| `isLoading` | Boolean | No | `false` | Whether the manifest is still loading; drives the loading phase |
| `customComponents` | Object | No | `{}` | Custom-component registry. Resolved by name across the library: (1) `type: "custom"` pages and slot overrides in `CnPageRenderer`, (2) `pages[].config.cardComponent` for bespoke card-grid views in `CnIndexPage`, (3) `pages[].config.sidebar.tabs[].component` and tab widgets in `CnObjectSidebar`, (4) settings sections and widgets in `CnSettingsPage`. Provided to descendants as `cnCustomComponents`. |
| `formatters` | Object | No | `{}` | Cell-formatter registry — map of formatter-id → `(value, row, property) => string\|number`. Resolves the `pages[].config.columns[].formatter` ids that `index` / `logs` pages declare, so per-column value formatting (status-label maps, "days in step", currency, …) lives in small pure data functions instead of bespoke `type:"custom"` table views. Provided to descendant `CnDataTable` / `CnCellRenderer` as `cnFormatters`. A column with no `formatter`, or an app that passes no `formatters`, renders exactly as before. See `docs/migrating-to-manifest.md` → "Column formatters". |
| `cellWidgets` | Object | No | `{}` | Cell-widget registry — map of widget-id → Vue component, rendered for a column that declares `pages[].config.columns[].widget`. The component receives `{ value, row, property, formatted, ...widgetProps }`. The library ships one built-in id, `"badge"` (renders `CnStatusBadge`); consumer entries cover everything else (status pills with custom colour maps, inline toggles, link cells, …). Provided to descendant `CnDataTable` / `CnCellRenderer` as `cnCellWidgets`. See `docs/migrating-to-manifest.md` → "Column widgets". |
| `translate` | Function | No | `key => key` | Translate function from the consuming app, typically `(key) => t(appId, key)`. Provided to descendants as `cnTranslate` |
| `permissions` | Array | No | `[]` | Permission strings for the current user; forwarded to `CnAppNav` for menu filtering |
| `pageTypes` | Object | No | `null` | Page-type registry map (`type → component`). Falls back to the library's `defaultPageTypes`. Extend with `{ ...defaultPageTypes, report: MyReportPage }` |
| `userSettingsTitle` | String | No | `''` | Title shown at the top of the hosted `NcAppSettingsDialog`. Empty (the default) resolves to `translate('User settings')`. Override per app to brand the modal (e.g. `'Decidesk preferences'`). |
| `requiresApps` | Array | No | `['openregister']` | App ids that MUST be installed for the host app to function. Checked against the OCS capabilities API on mount. When any required app is missing, CnAppRoot renders the empty state from the `or-missing` slot (default: `<NcEmptyContent>`) instead of the renderer. Pass `[]` to opt out (e.g. mydash, the docs/styleguide app) — useful for any consumer that does not depend on OpenRegister. |

## Slots

| Slot | Scope | Description |
|------|-------|-------------|
| *(default)* | — | Page content inside `NcAppContent`. Pass `<router-view />` here in a real app. |
| `loading` | — | Shown during the loading phase (replaces `CnAppLoading`) |
| `dependency-missing` | `{ dependencies }` | Shown when required apps are missing (replaces `CnDependencyMissing`) |
| `or-missing` | `{ missingApps }` | Shown when any app in `requiresApps` is missing per the OCS capabilities check. Default body is an `NcEmptyContent` linking to the OpenRegister app-store integration page; override to fully replace it. |
| `menu` | — | Navigation area (replaces `CnAppNav`) |
| `header-actions` | — | Extra buttons rendered in the app header |
| `sidebar` | — | Sidebar area rendered alongside `NcAppContent` |
| `footer` | — | Footer area rendered inside `NcAppContent` |
| `user-settings` | — | `NcAppSettingsSection` children rendered inside the host `NcAppSettingsDialog`. CnAppRoot always mounts the dialog and exposes `cnOpenUserSettings` via inject; CnAppNav binds it to manifest items declaring `action: "user-settings"`. Defaults to a single placeholder section. |

## AI Chat Companion — Context push

`CnAppRoot` is the origin of the `cnAiContext` reactive object. It:

1. Creates `cnAiContext` via `Vue.observable({ appId, pageKind: 'custom', route: { path: window.location.pathname } })` in `data()`.
2. Provides it to all descendants under the `cnAiContext` injection key.
3. Mounts `<CnAiCompanion />` as a fixed-position child of the app shell — the companion renders a floating action button (FAB) and slide-out chat panel automatically whenever the OpenRegister health probe returns 2xx.

No new props are required. The `appId` prop value is automatically forwarded to `cnAiContext.appId` on creation.

| Field written | Value |
|---|---|
| `appId` | equals the `appId` prop |
| `pageKind` | `'custom'` (initial; page components overwrite this) |
| `route.path` | `window.location.pathname` at mount time |

Descendant page components (`CnIndexPage`, `CnDetailPage`, `CnDashboardPage`) overwrite `pageKind`, `registerSlug`, `schemaSlug`, and `objectUuid` on the same reactive object to give the AI companion per-page context.

## Examples

### Static manifest with backend override (default)

```js
import { CnAppRoot, useAppManifest } from '@conduction/nextcloud-vue'
import bundledManifest from '../manifest.json'

export default {
  setup() {
    const { manifest, isLoading } = useAppManifest('myapp', bundledManifest)
    return { manifest, isLoading }
  },
}
```

### In-memory manifest (virtual-app hosts, e.g. OpenBuilt)

Virtual-app hosts build their manifest in memory and have no backend route. Pass an options object with the constructed manifest and the composable skips the fetch entirely:

```vue
<template>
  <CnAppRoot
    app-id="openbuilt"
    :manifest="manifest"
    :is-loading="isLoading">
    <router-view />
  </CnAppRoot>
</template>

<script>
import { CnAppRoot, useAppManifest } from '@conduction/nextcloud-vue'

export default {
  components: { CnAppRoot },
  setup() {
    const builderManifest = buildManifestFromStore()
    const { manifest, isLoading } = useAppManifest({ manifest: builderManifest })
    return { manifest, isLoading }
  },
}
</script>
```

`isLoading.value` is `false` from the first read, no HTTP request is issued, and the returned `{ manifest, isLoading, validationErrors, unresolvedSentinels }` shape matches the legacy positional signature so `CnAppRoot` consumes it unchanged.

### In-memory manifest with pre-mount validation

Add `validate: true` for synchronous schema validation — failures populate `validationErrors` and emit a `console.warn` prefixed `[useAppManifest]` but never replace the manifest (informational policy, mirroring the legacy branch):

```js
const { manifest, isLoading, validationErrors } = useAppManifest({
  manifest: builderManifest,
  validate: true,
})
// validationErrors.value === null on success, string[] on failure.
```

See [`useAppManifest` — Mounting an in-memory manifest](../../../docs/utilities/composables/use-app-manifest.md#mounting-an-in-memory-manifest).

## Mounting an in-memory manifest

Static-manifest apps use `useAppManifest('myapp', bundledManifest)`, which fetches `/index.php/apps/myapp/api/manifest` and deep-merges any backend override. Virtual-app hosts (e.g. the OpenBuilt app builder) use the in-memory overload `useAppManifest({ manifest })` — see the [In-memory manifest example](#in-memory-manifest-virtual-app-hosts-eg-openbuilt) above.
