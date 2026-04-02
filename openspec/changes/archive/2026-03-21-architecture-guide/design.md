# Design: architecture-guide

## Architecture

This change implements the architecture-guide specification as part of the @conduction/nextcloud-vue component library. Explains the design philosophy and layered architecture of `@conduction/nextcloud-vue` — how it builds on Nextcloud's own component system to provide higher-level, schema-driven page patterns. This specification also defines the project structure, build pipeline, coding conventions, dependency management, and consumer integration rules that govern the library.

## Implementation Approach

All 19 requirements from the spec have been implemented directly in the source components, composables, or utility modules as specified. The implementation follows the library's existing patterns: Vue 2 Options API for components, Pinia for stores, and standard ES module exports for utilities.

## Dependencies

- @nextcloud/vue (Layer 1 components)
- Pinia (store management)
- OpenRegister API (backend data layer)
