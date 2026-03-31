# Design: getting-started-guide

## Architecture

This change implements the getting-started-guide specification as part of the @conduction/nextcloud-vue component library. Provides a quick-start guide for building a new Nextcloud app using `@conduction/nextcloud-vue`. Walks developers through the minimum steps to go from zero to a working app with a list page, detail view, and sidebar navigation.

## Implementation Approach

All 12 requirements from the spec have been implemented directly in the source components, composables, or utility modules as specified. The implementation follows the library's existing patterns: Vue 2 Options API for components, Pinia for stores, and standard ES module exports for utilities.

## Dependencies

- @nextcloud/vue (Layer 1 components)
- Pinia (store management)
- OpenRegister API (backend data layer)
