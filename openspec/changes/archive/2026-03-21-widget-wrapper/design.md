# Design: widget-wrapper

## Architecture

This change implements the widget-wrapper specification as part of the @conduction/nextcloud-vue component library. `CnWidgetWrapper` is a widget container shell that provides a consistent visual frame for all widget types: optional header with icon and title, scrollable content area, and optional footer. It is used internally by `CnDashboardPage` to wrap each widget rendered by `CnDashboardGrid`.

## Implementation Approach

All 13 requirements from the spec have been implemented directly in the source components, composables, or utility modules as specified. The implementation follows the library's existing patterns: Vue 2 Options API for components, Pinia for stores, and standard ES module exports for utilities.

## Dependencies

- @nextcloud/vue (Layer 1 components)
- Pinia (store management)
- OpenRegister API (backend data layer)
