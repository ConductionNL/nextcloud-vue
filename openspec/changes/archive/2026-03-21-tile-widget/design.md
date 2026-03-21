# Design: tile-widget

## Architecture

This change implements the tile-widget specification as part of the @conduction/nextcloud-vue component library. `CnTileWidget` renders a quick-access tile with an icon and a link. It supports four icon types (SVG, CSS class, URL, emoji) and two link types (Nextcloud app route, external URL). Used internally by `CnDashboardPage` for tile-type widgets and by consumer apps (e.g. MyDash) for dashboard shortcuts.

## Implementation Approach

All 15 requirements from the spec have been implemented directly in the source components, composables, or utility modules as specified. The implementation follows the library's existing patterns: Vue 2 Options API for components, Pinia for stores, and standard ES module exports for utilities.

## Dependencies

- @nextcloud/vue (Layer 1 components)
- Pinia (store management)
- OpenRegister API (backend data layer)
