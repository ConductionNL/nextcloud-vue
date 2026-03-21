# useDashboardView Specification

## Problem
`useDashboardView(options)` is a composable exported by `@conduction/nextcloud-vue` that manages dashboard state: widget definitions, layout, NC Dashboard API widget loading, and layout persistence. It is the dashboard equivalent of `useListView` — the composable that handles all the state management a `CnDashboardPage` needs.
---

## Proposed Solution
Implement useDashboardView Specification following the detailed specification. Key requirements include:
- Requirement: Widget definitions initialization
- Requirement: Dynamic widget updates via setWidgets
- Requirement: Default layout fallback
- Requirement: Layout persistence — async load
- Requirement: Layout persistence — async save

## Scope
This change covers all requirements defined in the use-dashboard-view specification.

## Success Criteria
- Static widgets provided at initialization
- Empty widgets array by default
- setWidgets replaces the entire widget list
- No loadLayout function provided
- loadLayout returns null or empty array
