# CnIndexPage

## Problem
CnIndexPage is the top-level, schema-driven index page component that assembles sub-components (CnPageHeader, CnActionsBar, CnDataTable, CnCardGrid, CnPagination, CnRowActions, CnMassActionBar, and all 7 dialog components) into a single zero-config page for listing, selecting, and managing objects. It serves as the primary entry point for all CRUD-oriented list views across Conduction apps (OpenRegister, Pipelinq, Procest, etc.), eliminating boilerplate by providing built-in pagination, sorting pass-through, dual view modes, three-level dialog overrides, mass actions, and optional store integration. When paired with the `useListView` composable, a consumer can render a fully functional index page with as few as 3 props.
**File**: `src/components/CnIndexPage/CnIndexPage.vue`
---

## Proposed Solution
Implement CnIndexPage following the detailed specification. Key requirements include:
- Requirement: Schema-Driven Column Generation
- Requirement: Table and Card View Toggle
- Requirement: Pagination via CnPagination
- Requirement: Mass Actions
- Requirement: Single-Object Dialogs (Form, Delete, Copy)

## Scope
This change covers all requirements defined in the index-page specification.

## Success Criteria
- Auto-generate columns from schema
- Explicit columns override schema
- Column filtering via excludeColumns
- Column whitelisting via includeColumns
- Per-column overrides
