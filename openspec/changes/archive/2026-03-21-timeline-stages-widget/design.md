# Design: timeline-stages-widget

## Architecture

This change implements the timeline-stages-widget specification as part of the @conduction/nextcloud-vue component library. Provides a reusable Vue component for visualizing sequential progression through named stages. Used in case management, pipeline tracking, and any workflow with discrete phases.

## Implementation Approach

All 25 requirements from the spec have been implemented directly in the source components, composables, or utility modules as specified. The implementation follows the library's existing patterns: Vue 2 Options API for components, Pinia for stores, and standard ES module exports for utilities.

## Dependencies

- @nextcloud/vue (Layer 1 components)
- Pinia (store management)
- OpenRegister API (backend data layer)
