# Data Display — Components Spec

## Problem
Specifies the data display components: CnDataTable, CnCardGrid, CnObjectCard, CnCellRenderer, CnStatusBadge, CnPagination, CnFilterBar, CnFacetSidebar, CnKpiGrid.
**Files:**
- `src/components/CnDataTable/CnDataTable.vue`
- `src/components/CnCardGrid/CnCardGrid.vue`
- `src/components/CnObjectCard/CnObjectCard.vue`
- `src/components/CnCellRenderer/CnCellRenderer.vue`
- `src/components/CnStatusBadge/CnStatusBadge.vue`
- `src/components/CnPagination/CnPagination.vue`
- `src/components/CnFilterBar/CnFilterBar.vue`
- `src/components/CnFacetSidebar/CnFacetSidebar.vue`

## Proposed Solution
Implement Data Display — Components Spec following the detailed specification. Key requirements include:
- Requirement: CnDataTable — Scrollable Container Mode
- Requirement: CnObjectCard — Metadata Slot Override
- Requirement: CnPagination — Translatable Labels

## Scope
This change covers all requirements defined in the data-display specification.

## Success Criteria
- Schema-driven column generation
- Manual column definitions
- Schema with excludeColumns and includeColumns
- Schema with columnOverrides
- Dot-notation nested values
