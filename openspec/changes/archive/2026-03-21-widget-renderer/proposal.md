# CnWidgetRenderer Specification

## Problem
`CnWidgetRenderer` renders Nextcloud Dashboard API widgets (v1 and v2) with auto-refresh. It is self-contained: it fetches items from the OCS endpoint, transforms them to the NcDashboardWidget format, and renders them. Used internally by `CnDashboardPage` for NC API widget types.
---

## Proposed Solution
Implement CnWidgetRenderer Specification following the detailed specification. Key requirements include:
- Requirement: API version detection
- Requirement: item loading
- Requirement: item format transformation
- Requirement: loading state
- Requirement: auto-refresh

## Scope
This change covers all requirements defined in the widget-renderer specification.

## Success Criteria
- v2 API preferred when supported
- v1 API used when v2 not listed
- non-API widget detected
- items fetched on mount
- v1 response format handled
