# Composables — Spec

## Problem
Specifies the Vue composables exported by `@conduction/nextcloud-vue`: `useListView`, `useDetailView`, `useSubResource`, and `useDashboardView`. These composables encapsulate reactive state management patterns for list pages, detail pages, sub-resource fetching, and dashboard layouts, integrating with the `useObjectStore` Pinia store and the Nextcloud platform APIs.
**Files**: `src/composables/useListView.js`, `src/composables/useDetailView.js`, `src/composables/useSubResource.js`, `src/composables/useDashboardView.js`, `src/composables/index.js`
**Cross-references**: [index-page](../index-page/spec.md), [dashboard-page](../dashboard-page/spec.md), [store](../store/spec.md), [use-list-view](../use-list-view/spec.md), [use-detail-view](../use-detail-view/spec.md), [use-dashboard-view](../use-dashboard-view/spec.md)
---

## Proposed Solution
Implement Composables — Spec following the detailed specification. Key requirements include:
- Requirement: REQ-CO-001 — useListView New API: Store-Integrated List State
- Requirement: REQ-CO-002 — useListView Pagination and Page Size
- Requirement: REQ-CO-003 — useListView Sidebar Wiring
- Requirement: REQ-CO-004 — useListView Legacy API Backward Compatibility
- Requirement: REQ-CO-005 — useDetailView New API: Store-Integrated Detail State

## Scope
This change covers all requirements defined in the composables specification.

## Success Criteria
- Schema loading and initial fetch on mount
- Search with configurable debounce
- Sort via onSort event handler
- Filter change resets pagination
- Filter removal on empty array
