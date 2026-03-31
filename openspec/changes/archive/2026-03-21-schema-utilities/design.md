# Design: schema-utilities

## Architecture

This change implements the schema-utilities specification as part of the @conduction/nextcloud-vue component library. Specifies the utility functions that auto-generate table columns, form fields, and filter definitions from JSON Schema properties, plus helper utilities for value formatting, HTTP headers, query strings, and error parsing.

## Implementation Approach

All 17 requirements from the spec have been implemented directly in the source components, composables, or utility modules as specified. The implementation follows the library's existing patterns: Vue 2 Options API for components, Pinia for stores, and standard ES module exports for utilities.

## Dependencies

- @nextcloud/vue (Layer 1 components)
- Pinia (store management)
- OpenRegister API (backend data layer)
