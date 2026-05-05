CnAppNav renders the Nextcloud app sidebar navigation from a manifest's `menu[]` array. It is normally used inside CnAppRoot which provides the manifest via injection.

Standalone usage with a manifest prop (for use without CnAppRoot):

```vue
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
