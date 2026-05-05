# CnAppRoot

Top-level wrapper for manifest-driven Conduction apps. Provides the manifest, custom-component registry, page-type registry, and translate function to descendants via `provide` / `inject`. Orchestrates three rendering phases: **loading** → **dependency-check** → **shell**.

CnAppRoot is the full-shell convenience for the JSON manifest renderer. Apps that want manifest-driven pages but their own root layout can skip CnAppRoot and use [`CnPageRenderer`](./cn-page-renderer.md) / [`CnAppNav`](./cn-app-nav.md) directly with explicit props.

**Wraps**: `NcContent`, `NcAppContent`, [`CnAppLoading`](./cn-app-loading.md), [`CnDependencyMissing`](./cn-dependency-missing.md), [`CnAppNav`](./cn-app-nav.md)

## Phases

| Phase | When | Default rendering | Override slot |
|-------|------|-------------------|---------------|
| `loading` | While `isLoading` is `true` | `<CnAppLoading />` | `#loading` |
| `dependency-missing` | After loading; any entry in `manifest.dependencies` is not installed/enabled | `<CnDependencyMissing />` | `#dependency-missing` |
| `shell` | Manifest loaded + dependencies satisfied | `<CnAppNav />` + `<router-view />` | `#menu`, `#header-actions`, `#sidebar`, `#footer` |

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
| `pageTypes` | `Object \| null` | `null` | Map of `pages[].type` → Vue component. Provided to descendant renderers as `cnPageTypes`. When omitted, the renderer falls back to `defaultPageTypes`. |
| `translate` | `Function` | identity | App-supplied translator — typically `(key) => t(appId, key)`. Named `translate` (not `t`) to avoid shadowing the global `t()` mixin. Provided as `cnTranslate`. |
| `permissions` | `Array<string>` | `[]` | Permission strings the current user holds. Forwarded to `CnAppNav` for menu filtering. |

## Provided values

CnAppRoot calls `provide()` with the following keys; descendants `inject` these:

| Inject key | Provided value |
|------------|----------------|
| `cnManifest` | The `manifest` prop |
| `cnCustomComponents` | The `customComponents` prop |
| `cnTranslate` | The `translate` prop |
| `cnPageTypes` | The `pageTypes` prop |

## Slots

| Slot | Scope | Default | Description |
|------|-------|---------|-------------|
| `loading` | — | `<CnAppLoading />` | Shown during the loading phase |
| `dependency-missing` | `{ dependencies }` | `<CnDependencyMissing :dependencies />` | Shown when any dependency is missing or disabled |
| `menu` | — | `<CnAppNav :permissions />` | Replaces the default app navigation |
| `header-actions` | — | — | Mounted inside `NcAppContent`, alongside `<router-view />` |
| `sidebar` | — | — | Mounted next to `NcAppContent` (e.g. for `NcAppSidebar`) |
| `footer` | — | — | Mounted inside `NcAppContent`, after `<router-view />` |

## Related

- [useAppManifest](../utilities/composables/use-app-manifest.md) — Loads/validates the manifest passed in.
- [useAppStatus](../utilities/composables/use-app-status.md) — Backs the dependency-check phase.
- [CnPageRenderer](./cn-page-renderer.md) — Mounts inside `<router-view>` to dispatch by page type.
- [CnAppNav](./cn-app-nav.md) — Default `#menu` rendering.
- [defaultPageTypes](../utilities/default-page-types.md) — Built-in page-type registry.
- [validateManifest](../utilities/validate-manifest.md) — The validator used inside `useAppManifest`.
- [migrating-to-manifest](../migrating-to-manifest.md) — Tier-by-tier adoption guide.
