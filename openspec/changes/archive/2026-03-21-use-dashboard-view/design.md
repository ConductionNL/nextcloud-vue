# Design: use-dashboard-view

## Architecture

This change implements the use-dashboard-view specification as part of the @conduction/nextcloud-vue component library. `useDashboardView(options)` is a composable exported by `@conduction/nextcloud-vue` that manages dashboard state: widget definitions, layout, NC Dashboard API widget loading, and layout persistence. It is the dashboard equivalent of `useListView` — the composable that handles all the state management a `CnDashboardPage` needs.

## Implementation Approach

All 15 requirements from the spec have been implemented directly in the source components, composables, or utility modules as specified. The implementation follows the library's existing patterns: Vue 2 Options API for components, Pinia for stores, and standard ES module exports for utilities.

## Dependencies

- @nextcloud/vue (Layer 1 components)
- Pinia (store management)
- OpenRegister API (backend data layer)
