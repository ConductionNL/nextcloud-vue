# CnDashboardPage Specification

## Problem
`CnDashboardPage` is a top-level dashboard page component that assembles a header, a `CnDashboardGrid`, and widget rendering with automatic widget type detection. It is the dashboard equivalent of `CnIndexPage` — a single component that handles the full dashboard page lifecycle.
---

## Proposed Solution
Implement CnDashboardPage Specification following the detailed specification. Key requirements include:
- Requirement: page header rendering
- Requirement: widget type resolution
- Requirement: widget wrapper metadata pass-through
- Requirement: GridStack grid layout
- Requirement: drag-and-drop editing

## Scope
This change covers all requirements defined in the dashboard-page specification.

## Success Criteria
- header displays title and description
- title hidden when empty
- description hidden when empty
- custom header actions via slot
- tile widget detection
