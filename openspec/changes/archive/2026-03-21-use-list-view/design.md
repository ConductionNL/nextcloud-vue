# Design: use-list-view

## Architecture

This change implements the use-list-view specification as part of the @conduction/nextcloud-vue component library. `useListView(objectType, options?)` is a composable exported by `@conduction/nextcloud-vue` that provides everything a `CnIndexPage`-based list view needs: schema, reactive collection data, loading and pagination state, sidebar wiring, and event handlers for search, sort, filter, and pagination. It eliminates boilerplate that was previously duplicated verbatim across every list-view component.

## Implementation Approach

All 13 requirements from the spec have been implemented directly in the source components, composables, or utility modules as specified. The implementation follows the library's existing patterns: Vue 2 Options API for components, Pinia for stores, and standard ES module exports for utilities.

## Dependencies

- @nextcloud/vue (Layer 1 components)
- Pinia (store management)
- OpenRegister API (backend data layer)
