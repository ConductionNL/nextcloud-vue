# useListView Specification

## Problem
`useListView(objectType, options?)` is a composable exported by `@conduction/nextcloud-vue` that provides everything a `CnIndexPage`-based list view needs: schema, reactive collection data, loading and pagination state, sidebar wiring, and event handlers for search, sort, filter, and pagination. It eliminates boilerplate that was previously duplicated verbatim across every list-view component.
---

## Proposed Solution
Implement useListView Specification following the detailed specification. Key requirements include:
- Requirement: objectStore integration
- Requirement: schema loading on mount
- Requirement: search debounce
- Requirement: fetch with params
- Requirement: filter state management

## Scope
This change covers all requirements defined in the use-list-view specification.

## Success Criteria
- objects reflect store collection
- loading state is forwarded
- loading defaults to false when absent
- pagination is forwarded
- pagination defaults when absent
