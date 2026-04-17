# Design: index-page

## Architecture

This change implements the index-page specification as part of the @conduction/nextcloud-vue component library. CnIndexPage is the top-level, schema-driven index page component that assembles sub-components (CnPageHeader, CnActionsBar, CnDataTable, CnCardGrid, CnPagination, CnRowActions, CnMassActionBar, and all 7 dialog components) into a single zero-config page for listing, selecting, and managing objects. It serves as the primary entry point for all CRUD-oriented list views across Conduction apps (OpenRegister, Pipelinq, Procest, etc.), eliminating boilerplate by providing built-in pagination, sorting pass-through, dual view modes, three-level dialog overrides, mass actions, and optional store integration. When paired with the `useListView` composable, a consumer can render a fully functional index page with as few as 3 props.

## Implementation Approach

All 18 requirements from the spec have been implemented directly in the source components, composables, or utility modules as specified. The implementation follows the library's existing patterns: Vue 2 Options API for components, Pinia for stores, and standard ES module exports for utilities.

## Dependencies

- @nextcloud/vue (Layer 1 components)
- Pinia (store management)
- OpenRegister API (backend data layer)
