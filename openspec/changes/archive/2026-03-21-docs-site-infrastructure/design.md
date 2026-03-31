# Design: docs-site-infrastructure

## Architecture

This change implements the docs-site-infrastructure specification as part of the @conduction/nextcloud-vue component library. Defines the Docusaurus project setup, build pipeline, GitHub Pages deployment, and site structure for the `@conduction/nextcloud-vue` documentation website. This is the foundation that all other documentation specs build on.

## Implementation Approach

All 11 requirements from the spec have been implemented directly in the source components, composables, or utility modules as specified. The implementation follows the library's existing patterns: Vue 2 Options API for components, Pinia for stores, and standard ES module exports for utilities.

## Dependencies

- @nextcloud/vue (Layer 1 components)
- Pinia (store management)
- OpenRegister API (backend data layer)
