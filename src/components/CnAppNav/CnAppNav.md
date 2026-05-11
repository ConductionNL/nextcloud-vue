CnAppNav renders the Nextcloud app sidebar navigation from a manifest's `menu[]` array. It is normally used inside CnAppRoot which provides the manifest via injection.

Standalone usage with a manifest prop (for use without CnAppRoot):

```vue {static}
<template>
  <div style="height: 400px; width: 260px; background: var(--color-main-background); border: 1px solid var(--color-border); border-radius: 8px; overflow: hidden;">
    <CnAppNav
      :manifest="manifest"
      :translate="(key) => key" />
  </div>
</template>
<script>
export default {
  data() {
    return {
      manifest: {
        menu: [
          { id: 'dashboard', label: 'Dashboard', icon: 'icon-home', route: 'dashboard', order: 1 },
          { id: 'objects', label: 'Objects', icon: 'icon-category-files', route: 'objects-index', order: 2 },
          { id: 'schemas', label: 'Schemas', icon: 'icon-template', route: 'schemas-index', order: 3 },
          { id: 'settings', label: 'Settings', icon: 'icon-settings', route: 'settings', section: 'settings', order: 10 },
        ],
      },
    }
  },
}
</script>
```

Permission filtering — pass a `permissions` array to hide menu items the user does not hold. Items with a `permission` field only render when their permission string appears in the `permissions` prop. When `permissions` is omitted or empty, all items are shown regardless:

```vue {static}
<template>
  <div style="height: 300px; width: 260px; background: var(--color-main-background); border: 1px solid var(--color-border); border-radius: 8px; overflow: hidden;">
    <CnAppNav
      :manifest="manifest"
      :permissions="userPermissions"
      :translate="(key) => key" />
  </div>
</template>
<script>
export default {
  data() {
    return {
      userPermissions: ['objects:read'],
      manifest: {
        menu: [
          { id: 'objects', label: 'Objects', icon: 'icon-category-files', route: 'objects-index', order: 1 },
          { id: 'admin', label: 'Admin', icon: 'icon-settings', route: 'admin', order: 2, permission: 'admin:access' },
        ],
      },
    }
  },
}
</script>
```

`visibleIf.appInstalled` filter — a menu item can declare a `visibleIf` condition to hide cross-app links when the target app is not installed. The item only renders when the named Nextcloud app is found in `OC.appswebroots` (primary) or the capabilities API (fallback). Items without `visibleIf` are always visible (backwards-compatible).

Typical use: a "View in mydash" link that should only show when mydash is enabled:

```vue {static}
<template>
  <div style="height: 200px; width: 260px; background: var(--color-main-background); border: 1px solid var(--color-border); border-radius: 8px; overflow: hidden;">
    <CnAppNav
      :manifest="manifest"
      :translate="(key) => key" />
  </div>
</template>
<script>
export default {
  data() {
    return {
      manifest: {
        menu: [
          { id: 'home', label: 'Home', icon: 'icon-home', route: 'home', order: 1 },
          {
            id: 'view-in-mydash',
            label: 'View in mydash',
            icon: 'icon-external',
            href: '/index.php/apps/mydash#scholiq-compliance',
            order: 2,
            visibleIf: { appInstalled: 'mydash' },
          },
        ],
      },
    }
  },
}
</script>
```

In the example above, "View in mydash" renders only when `mydash` is detected in `OC.appswebroots` or the capabilities bootstrap. In a fresh Nextcloud without mydash the item is hidden entirely; once mydash is installed and enabled it appears automatically on the next page load (results are cached per load). This satisfies the `feedback_mydash-no-or-dependency` guideline — cross-app links are runtime-conditional, not install-time dependencies.
