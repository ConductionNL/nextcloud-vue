# Design: integration-guides

## Architecture

This change implements the integration-guides specification as part of the @conduction/nextcloud-vue component library. Documents how `@conduction/nextcloud-vue` connects to external systems -- specifically OpenRegister (the backend schema/object engine), the NL Design System (theming layer), and the consumer app ecosystem. These guides help developers understand the full stack, not just the Vue components in isolation.

## Implementation Approach

All 10 requirements from the spec have been implemented directly in the source components, composables, or utility modules as specified. The implementation follows the library's existing patterns: Vue 2 Options API for components, Pinia for stores, and standard ES module exports for utilities.

## Dependencies

- @nextcloud/vue (Layer 1 components)
- Pinia (store management)
- OpenRegister API (backend data layer)
