CnAppRoot is the top-level manifest-driven app shell. It orchestrates three phases: loading → dependency check → shell. In a real app it wraps the entire Nextcloud content area.

The component requires a router, Nextcloud globals, and a live capabilities API for dependency checking — it is best demonstrated in a running Nextcloud environment. See `docs/components/cn-app-root.md` and `docs/migrating-to-manifest.md` for full usage.

Minimal conceptual shell (illustrative, not fully runnable in the styleguide):

```vue
<template>
  <CnAppRoot :app-id="'myapp'" :manifest="manifest">
    <template #menu>
      <!-- CnAppNav is injected automatically; override here for custom nav -->
    </template>
    <router-view />
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
