# Design: component-reference

## Architecture

This change implements the component-reference specification as part of the @conduction/nextcloud-vue component library. Defines the per-component documentation pages that explain each Cn* component's purpose, props, events, slots, and usage examples. This is the primary reference for developers building apps with `@conduction/nextcloud-vue`.

## Implementation Approach

All 12 requirements from the spec have been implemented directly in the source components, composables, or utility modules as specified. The implementation follows the library's existing patterns: Vue 2 Options API for components, Pinia for stores, and standard ES module exports for utilities.

## Dependencies

- @nextcloud/vue (Layer 1 components)
- Pinia (store management)
- OpenRegister API (backend data layer)
