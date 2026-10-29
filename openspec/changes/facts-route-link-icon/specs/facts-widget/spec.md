# facts-widget Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [facts-route-link-icon](../../)

## ADDED Requirements

### Requirement: A route link keeps its icon

A facts foot link (`content.link`) that names an `icon` SHALL draw it before its label whether the link opens a route, a sidebar tab or an href.

#### Scenario: Cases on the map

- GIVEN a facts card whose link is `{ label: "Cases on the map", icon: "MapMarkerOutline", route: { name: "Cases" } }`
- THEN the link draws the MapMarkerOutline icon before "Cases on the map"

#### Scenario: No icon named

- GIVEN a route link without `icon`
- THEN the link draws no icon
