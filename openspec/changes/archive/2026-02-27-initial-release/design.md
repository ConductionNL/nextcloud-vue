# Design: Initial Release

## Architecture
- **Vue 2 Options API** components for Nextcloud compatibility
- **Rollup build** producing ESM + CJS bundles with CSS extraction
- **Barrel exports** from `src/index.js` for clean imports
- **NL Design tokens** via CSS custom properties for government theming
- **Pinia store** (`useObjectStore`) with plugin architecture for extensible CRUD
- **Composables** encapsulate view logic (list pagination, detail loading, sub-resource management)
- **Utilities** provide HTTP helpers and standardized error handling

## Key Decisions
- Vue 2 (not 3) to match Nextcloud server ecosystem
- Source alias (`../nextcloud-vue/src`) supported for development, npm package for production
- All components prefixed `Cn` to avoid collisions with `@nextcloud/vue`
