# Design: use-detail-view

## Architecture

This change implements the use-detail-view specification as part of the @conduction/nextcloud-vue component library. `useDetailView(objectType, id, options?)` is a composable exported by `@conduction/nextcloud-vue` that provides reactive object data, save/delete operations, loading state, and optional post-operation router navigation for detail/edit views. It eliminates the boilerplate that was previously duplicated across every detail-view component.

## Implementation Approach

All 14 requirements from the spec have been implemented directly in the source components, composables, or utility modules as specified. The implementation follows the library's existing patterns: Vue 2 Options API for components, Pinia for stores, and standard ES module exports for utilities.

## Dependencies

- @nextcloud/vue (Layer 1 components)
- Pinia (store management)
- OpenRegister API (backend data layer)
