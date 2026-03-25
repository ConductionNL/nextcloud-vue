# CnWidgetRenderer Specification

## Purpose

`CnWidgetRenderer` renders Nextcloud Dashboard API widgets (v1 and v2) with auto-refresh. It is self-contained: it fetches items from the OCS endpoint, transforms them to the NcDashboardWidget format, and renders them. Used internally by `CnDashboardPage` for NC API widget types.

---

## Requirements

### Requirement: item loading

CnWidgetRenderer SHALL fetch widget items from the Nextcloud Dashboard OCS API on mount and render them.

#### Scenario: v2 API items loaded

- GIVEN a widget with `itemApiVersions: [2, 1]` and `id: 'weather'`
- WHEN the component mounts
- THEN it fetches items from the v2 OCS endpoint for the weather widget and renders them

#### Scenario: v1 API fallback

- GIVEN a widget with `itemApiVersions: [1]`
- WHEN the v2 endpoint is not available
- THEN it falls back to the v1 OCS endpoint

#### Scenario: loading state

- GIVEN the widget is fetching items
- WHEN the fetch is in progress
- THEN a loading indicator is shown

---

### Requirement: auto-refresh

CnWidgetRenderer SHALL periodically refresh widget items.

#### Scenario: items refresh on interval

- GIVEN the widget is mounted and items are loaded
- WHEN the refresh interval elapses
- THEN fresh items are fetched from the API

#### Scenario: refresh stops on unmount

- GIVEN the widget has an active refresh timer
- WHEN the component is destroyed
- THEN the timer is cleared

---

### Requirement: error handling

CnWidgetRenderer SHALL handle API errors gracefully.

#### Scenario: unavailable widget shows fallback

- GIVEN the widget API returns an error
- WHEN rendering the widget
- THEN the `unavailableText` is displayed instead of items

#### Scenario: network error does not crash

- GIVEN a network error occurs during item fetch
- WHEN the fetch fails
- THEN the component shows the unavailable text without throwing
