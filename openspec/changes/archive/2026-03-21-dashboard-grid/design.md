# Design: dashboard-grid

## Architecture

This change implements the dashboard-grid specification as part of the @conduction/nextcloud-vue component library. `CnDashboardGrid` is the core grid layout engine that wraps GridStack.js. It manages grid initialization, item positioning, drag/drop, resize, and layout synchronization. It is a low-level component used internally by `CnDashboardPage`.

## Implementation Approach

All 15 requirements from the spec have been implemented directly in the source components, composables, or utility modules as specified. The implementation follows the library's existing patterns: Vue 2 Options API for components, Pinia for stores, and standard ES module exports for utilities.

## Dependencies

- @nextcloud/vue (Layer 1 components)
- Pinia (store management)
- OpenRegister API (backend data layer)
