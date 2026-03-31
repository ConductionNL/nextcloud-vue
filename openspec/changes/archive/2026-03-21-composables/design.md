# Design: composables

## Architecture

This change implements the composables specification as part of the @conduction/nextcloud-vue component library. Specifies the Vue composables exported by `@conduction/nextcloud-vue`: `useListView`, `useDetailView`, `useSubResource`, and `useDashboardView`. These composables encapsulate reactive state management patterns for list pages, detail pages, sub-resource fetching, and dashboard layouts, integrating with the `useObjectStore` Pinia store and the Nextcloud platform APIs.

## Implementation Approach

All 15 requirements from the spec have been implemented directly in the source components, composables, or utility modules as specified. The implementation follows the library's existing patterns: Vue 2 Options API for components, Pinia for stores, and standard ES module exports for utilities.

## Dependencies

- @nextcloud/vue (Layer 1 components)
- Pinia (store management)
- OpenRegister API (backend data layer)
