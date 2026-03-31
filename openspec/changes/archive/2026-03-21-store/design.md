# Design: store

## Architecture

This change implements the store specification as part of the @conduction/nextcloud-vue component library. Specifies the Pinia object store (`useObjectStore`), factory function (`createObjectStore`), sub-resource plugin factory (`createSubResourcePlugin`), built-in plugins, and all supporting utilities for OpenRegister CRUD operations. This store is the single data layer shared by all Conduction Nextcloud apps (OpenRegister, Pipelinq, Procest, OpenCatalogi, MyDash).

## Implementation Approach

All 15 requirements from the spec have been implemented directly in the source components, composables, or utility modules as specified. The implementation follows the library's existing patterns: Vue 2 Options API for components, Pinia for stores, and standard ES module exports for utilities.

## Dependencies

- @nextcloud/vue (Layer 1 components)
- Pinia (store management)
- OpenRegister API (backend data layer)
