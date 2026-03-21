# CnWidgetWrapper Specification

## Problem
`CnWidgetWrapper` is a widget container shell that provides a consistent visual frame for all widget types: optional header with icon and title, scrollable content area, and optional footer. It is used internally by `CnDashboardPage` to wrap each widget rendered by `CnDashboardGrid`.
---

## Proposed Solution
Implement CnWidgetWrapper Specification following the detailed specification. Key requirements include:
- Requirement: widget container shell
- Requirement: title display with show/hide toggle
- Requirement: widget icon display
- Requirement: content area with default slot
- Requirement: header actions slot

## Scope
This change covers all requirements defined in the widget-wrapper specification.

## Success Criteria
- full-height flex layout
- default border and background
- header visible with title text
- header hidden
- default title fallback
