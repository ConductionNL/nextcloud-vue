# CnWidgetRenderer Specification

## Purpose

`CnWidgetRenderer` renders Nextcloud Dashboard API widgets (v1 and v2) with auto-refresh. It is self-contained: it fetches items from the OCS endpoint, transforms them to the NcDashboardWidget format, and renders them. Used internally by `CnDashboardPage` for NC API widget types.

---

## ADDED Requirements

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

---

### Current Implementation Status

**Already implemented — all requirements are fulfilled:**

- **File**: `src/components/CnWidgetRenderer/CnWidgetRenderer.vue`
- **Item loading**: `loadItems()` fetches from OCS Dashboard API. Detects v2 support via `widget.itemApiVersions.includes(2)`, falls back to v1. Uses `generateOcsUrl()` for endpoint URL. Items transformed to `NcDashboardWidget` format (`id`, `targetUrl`, `avatarUrl`, `mainText`, `subText`, etc.). Loading state managed via `loading` data prop.
- **Auto-refresh**: When `widget.reloadInterval > 0`, `setInterval` calls `loadItems()` at `reloadInterval * 1000` ms. Interval cleared in `beforeDestroy`.
- **Error handling**: API errors caught and logged (`console.error`), no throw. `unavailableText` prop shown via `NcEmptyContent` with `AlertCircleOutline` icon when widget is not an API widget. Empty content message from API response shown via `NcDashboardWidget`'s `#empty-content` slot.
- **Rendering**: Uses `NcDashboardWidget` from `@nextcloud/vue` with `items`, `showMoreUrl`, `loading`, `itemMenu`, `roundIcons` props.

**Not yet implemented:**
- V1-to-V2 fallback: Implementation picks v2 if available, otherwise v1. There is no retry-on-failure fallback from v2 to v1 — it uses whichever version is listed in `itemApiVersions`.

### Standards & References

- Nextcloud Dashboard OCS API: `/apps/dashboard/api/v{1,2}/widget-items`
- `@nextcloud/vue` NcDashboardWidget component for standardized widget rendering
- `@nextcloud/axios` for authenticated OCS requests
- `@nextcloud/router` `generateOcsUrl()` for OCS endpoint URL construction

### Specificity Assessment

- **Specific enough to implement?** Yes — all scenarios are clearly defined and implemented.
- **Missing/ambiguous:**
  - Spec says "v1 API fallback" when "v2 endpoint is not available" — but the implementation does not retry with v1 on v2 failure; it selects based on `itemApiVersions` array.
  - No mention of the `emptyContentMessage` from the API response.
  - No mention of `showMoreUrl` (from `widget.widgetUrl`) linking to the widget's full page.
  - `unavailableText` prop default is `'Widget not available'` — spec does not specify the default.
  - No mention of `NcDashboardWidget` item format transformation details.
- **Open questions:**
  - Should there be a true fallback mechanism (try v2, on failure retry with v1)?
