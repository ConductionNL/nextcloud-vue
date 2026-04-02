# Design: widget-renderer

## Architecture

This change implements the widget-renderer specification as part of the @conduction/nextcloud-vue component library. `CnWidgetRenderer` renders Nextcloud Dashboard API widgets (v1 and v2) with auto-refresh. It is self-contained: it fetches items from the OCS endpoint, transforms them to the NcDashboardWidget format, and renders them. Used internally by `CnDashboardPage` for NC API widget types.

## Implementation Approach

All 14 requirements from the spec have been implemented directly in the source components, composables, or utility modules as specified. The implementation follows the library's existing patterns: Vue 2 Options API for components, Pinia for stores, and standard ES module exports for utilities.

## Dependencies

- @nextcloud/vue (Layer 1 components)
- Pinia (store management)
- OpenRegister API (backend data layer)
