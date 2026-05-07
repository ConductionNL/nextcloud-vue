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
| `customComponents` | Object | No | `{}` | Custom-component registry for `type: "custom"` pages and slot overrides in `CnPageRenderer` |
| `translate` | Function | No | `key => key` | Translate function from the consuming app, typically `(key) => t(appId, key)`. Provided to descendants as `cnTranslate` |
| `permissions` | Array | No | `[]` | Permission strings for the current user; forwarded to `CnAppNav` for menu filtering |
| `pageTypes` | Object | No | `null` | Page-type registry map (`type → component`). Falls back to the library's `defaultPageTypes`. Extend with `{ ...defaultPageTypes, report: MyReportPage }` |

## Slots

| Slot | Scope | Description |
|------|-------|-------------|
| *(default)* | — | Page content inside `NcAppContent`. Pass `<router-view />` here in a real app. |
| `loading` | — | Shown during the loading phase (replaces `CnAppLoading`) |
| `dependency-missing` | `{ dependencies }` | Shown when required apps are missing (replaces `CnDependencyMissing`) |
| `menu` | — | Navigation area (replaces `CnAppNav`) |
| `header-actions` | — | Extra buttons rendered in the app header |
| `sidebar` | — | Sidebar area rendered alongside `NcAppContent` |
| `footer` | — | Footer area rendered inside `NcAppContent` |
