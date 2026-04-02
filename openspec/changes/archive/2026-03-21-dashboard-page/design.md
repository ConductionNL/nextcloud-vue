# Design: dashboard-page

## Architecture

This change implements the dashboard-page specification as part of the @conduction/nextcloud-vue component library. `CnDashboardPage` is a top-level dashboard page component that assembles a header, a `CnDashboardGrid`, and widget rendering with automatic widget type detection. It is the dashboard equivalent of `CnIndexPage` — a single component that handles the full dashboard page lifecycle.

## Implementation Approach

All 14 requirements from the spec have been implemented directly in the source components, composables, or utility modules as specified. The implementation follows the library's existing patterns: Vue 2 Options API for components, Pinia for stores, and standard ES module exports for utilities.

## Dependencies

- @nextcloud/vue (Layer 1 components)
- Pinia (store management)
- OpenRegister API (backend data layer)
