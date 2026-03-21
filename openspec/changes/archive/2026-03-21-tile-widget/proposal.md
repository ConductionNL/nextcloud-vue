# CnTileWidget Specification

## Problem
`CnTileWidget` renders a quick-access tile with an icon and a link. It supports four icon types (SVG, CSS class, URL, emoji) and two link types (Nextcloud app route, external URL). Used internally by `CnDashboardPage` for tile-type widgets and by consumer apps (e.g. MyDash) for dashboard shortcuts.
---

## Proposed Solution
Implement CnTileWidget Specification following the detailed specification. Key requirements include:
- Requirement: SVG icon rendering
- Requirement: CSS class icon rendering
- Requirement: URL image icon rendering
- Requirement: emoji icon rendering
- Requirement: app link navigation

## Scope
This change covers all requirements defined in the tile-widget specification.

## Success Criteria
- SVG path renders inside a viewBox
- Nextcloud icon class renders with invert filter
- external image URL renders as img element
- emoji displays at icon size
- app link uses Nextcloud router
