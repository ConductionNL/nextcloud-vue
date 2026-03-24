# CnWidgetRenderer Specification

## Purpose

`CnWidgetRenderer` renders Nextcloud Dashboard API widgets (v1 and v2) with auto-refresh. It is self-contained: it fetches items from the OCS endpoint, transforms them to the NcDashboardWidget format, and renders them. Used internally by `CnDashboardPage` for NC API widget types.

---

## Requirements

### Requirement: API version detection

CnWidgetRenderer SHALL detect which Dashboard API version a widget supports and use the highest available version.

#### Scenario: v2 API preferred when supported

- GIVEN a widget with `itemApiVersions: [2, 1]`
- WHEN the component determines which API version to use
- THEN it selects v2 as the preferred version

#### Scenario: v1 API used when v2 not listed

- GIVEN a widget with `itemApiVersions: [1]`
- WHEN the component determines which API version to use
- THEN it selects v1 as the API version

#### Scenario: non-API widget detected

- GIVEN a widget without `itemApiVersions` or with an empty array
- WHEN the component evaluates the widget
- THEN it treats the widget as a non-API widget and does not attempt to fetch items

---

### Requirement: item loading

CnWidgetRenderer SHALL fetch widget items from the Nextcloud Dashboard OCS API on mount and render them.

#### Scenario: items fetched on mount

- GIVEN a widget with `id: 'weather'` and `itemApiVersions: [2, 1]`
- WHEN the component mounts
- THEN it sends a GET request to the OCS endpoint `/apps/dashboard/api/v2/widget-items` with `params.widgets` containing the widget id
- AND it extracts items from `response.data.ocs.data[widgetId]`

#### Scenario: v1 response format handled

- GIVEN a widget using API v1
- WHEN items are fetched from `/apps/dashboard/api/v1/widget-items`
- THEN the response data at `ocs.data[widgetId]` is treated as the items array directly

#### Scenario: v2 response format handled

- GIVEN a widget using API v2
- WHEN items are fetched from `/apps/dashboard/api/v2/widget-items`
- THEN the response data at `ocs.data[widgetId].items` is used as the items array
- AND `ocs.data[widgetId].emptyContentMessage` is stored for the empty state

---

### Requirement: item format transformation

CnWidgetRenderer SHALL transform raw API items into the NcDashboardWidget item format.

#### Scenario: v1 item fields mapped

- GIVEN a v1 API response item with fields `title`, `subtitle`, `link`, `iconUrl`, `sinceId`
- WHEN the item is transformed for NcDashboardWidget
- THEN `mainText` is set from `title`, `subText` from `subtitle`, `targetUrl` from `link`, `avatarUrl` from `iconUrl`, and `id` from `sinceId`

#### Scenario: v2 item fields mapped

- GIVEN a v2 API response item with fields `mainText`, `subText`, `targetUrl`, `avatarUrl`, `avatarUsername`, `overlayIconUrl`
- WHEN the item is transformed for NcDashboardWidget
- THEN all fields are passed through with their original names

#### Scenario: missing fields default to empty strings

- GIVEN an API response item with some fields missing
- WHEN the item is transformed
- THEN missing string fields default to empty strings and `id` falls back to a random string

---

### Requirement: loading state

CnWidgetRenderer SHALL display a loading indicator while items are being fetched.

#### Scenario: loading spinner shown during fetch

- GIVEN the component has mounted and is fetching items
- WHEN the API request is in progress
- THEN a loading spinner (NcLoadingIcon at size 32) is displayed
- AND the NcDashboardWidget receives `loading: true`

#### Scenario: loading state cleared after fetch

- GIVEN the component is fetching items
- WHEN the API request completes (success or failure)
- THEN the loading state is set to false

---

### Requirement: auto-refresh

CnWidgetRenderer SHALL periodically refresh widget items based on the widget's reload interval.

#### Scenario: refresh timer started

- GIVEN a widget with `reloadInterval: 30` (seconds)
- WHEN the initial items are loaded
- THEN a refresh interval is set at 30000 milliseconds that calls `loadItems()`

#### Scenario: no refresh for zero interval

- GIVEN a widget with `reloadInterval: 0` or no `reloadInterval`
- WHEN the component mounts
- THEN no refresh interval is created

#### Scenario: refresh timer cleared on destroy

- GIVEN the widget has an active refresh interval
- WHEN the component is destroyed (beforeDestroy)
- THEN the interval is cleared to prevent memory leaks and stale requests

---

### Requirement: error handling

CnWidgetRenderer SHALL handle API errors gracefully without crashing.

#### Scenario: network error logged and suppressed

- GIVEN a network error occurs during item fetch
- WHEN the axios request rejects
- THEN the error is logged to `console.error` with the widget id
- AND the component does not throw or crash
- AND the loading state is set to false

#### Scenario: items preserved on refresh failure

- GIVEN items were previously loaded successfully
- WHEN a subsequent refresh request fails
- THEN the previously loaded items remain displayed

---

### Requirement: empty state

CnWidgetRenderer SHALL display an empty content message when the widget has no items.

#### Scenario: API empty content message shown

- GIVEN the API returns `emptyContentMessage` in the v2 response
- WHEN no items are present
- THEN the NcDashboardWidget `#empty-content` slot renders an NcEmptyContent with the API-provided message as description

#### Scenario: widget icon shown in empty state

- GIVEN a widget with `iconClass: 'icon-weather'`
- WHEN the empty state is displayed
- THEN a span with the widget's `iconClass` is rendered as the empty content icon

#### Scenario: no empty message when items exist

- GIVEN items were loaded successfully
- WHEN items array is non-empty
- THEN the empty content slot is not visible

---

### Requirement: unavailable widget fallback

CnWidgetRenderer SHALL display a fallback message for non-API widgets.

#### Scenario: unavailable text shown for non-API widget

- GIVEN a widget without `itemApiVersions`
- WHEN the component renders
- THEN an NcEmptyContent is shown with the `unavailableText` prop as description
- AND an AlertCircleOutline icon is displayed at size 48

#### Scenario: default unavailable text

- GIVEN no `unavailableText` prop is provided
- WHEN a non-API widget is rendered
- THEN the text "Widget not available" is displayed

#### Scenario: custom unavailable text

- GIVEN `unavailableText` is set to "Deze widget is niet beschikbaar"
- WHEN a non-API widget is rendered
- THEN the custom Dutch text is displayed

---

### Requirement: show more link

CnWidgetRenderer SHALL pass the widget's URL to NcDashboardWidget as the "show more" link.

#### Scenario: show more URL from widget

- GIVEN a widget with `widgetUrl: '/apps/weather'`
- WHEN items are rendered
- THEN NcDashboardWidget receives `showMoreUrl` set to `/apps/weather`

#### Scenario: no show more URL

- GIVEN a widget without `widgetUrl`
- WHEN items are rendered
- THEN NcDashboardWidget receives an undefined `showMoreUrl` and no "show more" link is displayed

---

### Requirement: icon rendering

CnWidgetRenderer SHALL support both round and square icon styles for widget items.

#### Scenario: round icons enabled

- GIVEN a widget with `itemIconsRound: true`
- WHEN items are rendered
- THEN NcDashboardWidget receives `roundIcons: true` and item avatars are displayed in circular frames

#### Scenario: square icons by default

- GIVEN a widget without `itemIconsRound` set
- WHEN items are rendered
- THEN NcDashboardWidget uses its default icon shape (not explicitly round)

---

### Requirement: item click navigation

CnWidgetRenderer SHALL make widget items clickable, navigating to the item's target URL.

#### Scenario: item with link navigates

- GIVEN a widget item with `link: 'https://example.com/item/1'`
- WHEN the item is rendered via NcDashboardWidget
- THEN the item's `targetUrl` is set to the link value
- AND clicking the item navigates to that URL (handled by NcDashboardWidget)

#### Scenario: item without link

- GIVEN a widget item with no `link` or `targetUrl` field
- WHEN the item is rendered
- THEN `targetUrl` defaults to an empty string and the item is not clickable

---

### Requirement: NL Design theming

CnWidgetRenderer SHALL be compatible with NL Design System theming via Nextcloud CSS variables.

#### Scenario: theme colors applied

- GIVEN the nldesign app has overridden Nextcloud CSS variables (e.g., `--color-primary-element`)
- WHEN the widget is rendered
- THEN the NcDashboardWidget and NcEmptyContent components inherit the themed colors
- AND no hardcoded color values are used in the component's CSS

#### Scenario: cn- prefixed CSS classes

- GIVEN the component's scoped styles
- WHEN CSS classes are defined
- THEN all custom classes use the `cn-` prefix (e.g., `cn-widget-renderer`, `cn-widget-renderer__loading`)

---

### Requirement: accessibility

CnWidgetRenderer SHALL be accessible according to WCAG AA guidelines.

#### Scenario: loading state announced

- GIVEN the component is in a loading state
- WHEN a screen reader encounters the widget
- THEN the NcLoadingIcon provides an accessible loading indication

#### Scenario: empty state readable

- GIVEN the widget has no items
- WHEN a screen reader encounters the empty content
- THEN the empty message description is readable by assistive technology

---

### Requirement: performance

CnWidgetRenderer SHALL render efficiently within the dashboard grid.

#### Scenario: full height layout

- GIVEN the component is placed inside a CnWidgetWrapper
- WHEN it renders
- THEN it fills 100% of the available height with 8px padding

#### Scenario: loading indicator centered

- GIVEN the component is in a loading state before items arrive
- WHEN the loading spinner is shown
- THEN it is vertically and horizontally centered using flexbox

---

## Current Implementation Status

**Already implemented -- all requirements are fulfilled:**

- **File**: `src/components/CnWidgetRenderer/CnWidgetRenderer.vue`
- **API version detection**: `isApiWidgetV2` and `isApiWidgetV1` computed properties check `widget.itemApiVersions.includes(2|1)`. `isApiWidget` is the union.
- **Item loading**: `loadItems()` fetches from OCS Dashboard API via `generateOcsUrl()`. Sends widget id in `params.widgets` array.
- **Item transformation**: `widgetItems` computed maps raw items to NcDashboardWidget format (`id`, `targetUrl`, `avatarUrl`, `avatarUsername`, `overlayIconUrl`, `mainText`, `subText`). Handles both v1 (`title`/`subtitle`/`link`/`iconUrl`/`sinceId`) and v2 (`mainText`/`subText`/`targetUrl`/`avatarUrl`) field names with fallbacks.
- **Loading state**: `loading` data prop toggled in `loadItems()` with `finally` block. Passed to NcDashboardWidget. Separate NcLoadingIcon shown for non-API widgets during load.
- **Auto-refresh**: When `widget.reloadInterval > 0`, `setInterval` calls `loadItems()` at `reloadInterval * 1000` ms. Interval cleared in `beforeDestroy`.
- **Error handling**: API errors caught, logged via `console.error`, loading set to false. No throw. Previous items preserved on refresh failure.
- **Empty state**: `emptyContentMessage` from v2 API stored in `emptyMessage`. Rendered via `NcEmptyContent` in the `#empty-content` slot with widget's `iconClass`.
- **Unavailable fallback**: Non-API widgets show `NcEmptyContent` with `unavailableText` prop (default: "Widget not available") and `AlertCircleOutline` icon.
- **Show more**: `widget.widgetUrl` passed as `showMoreUrl` to NcDashboardWidget.
- **Icon rendering**: `widget.itemIconsRound` passed as `roundIcons` to NcDashboardWidget.
- **Item click**: `targetUrl` mapped from `link` or `targetUrl` field; NcDashboardWidget handles navigation.
- **NL Design**: Uses only Nextcloud CSS variables; `cn-` prefixed classes; compatible with nldesign overrides.
- **Accessibility**: Delegates to NcDashboardWidget and NcEmptyContent which follow Nextcloud accessibility patterns.
- **Performance**: Full-height flex layout with centered loading state.

**Not yet implemented:**
- V1-to-V2 runtime fallback: Implementation selects API version from `itemApiVersions` at load time. There is no retry-on-failure fallback from v2 to v1.
- Item menu: `itemMenu` is hardcoded to `false`; no per-item action menus are supported.

## Standards & References

- Nextcloud Dashboard OCS API: `/apps/dashboard/api/v{1,2}/widget-items`
- `@nextcloud/vue` NcDashboardWidget component for standardized widget rendering
- `@nextcloud/axios` for authenticated OCS requests
- `@nextcloud/router` `generateOcsUrl()` for OCS endpoint URL construction
- NL Design System theming via Nextcloud CSS variable overrides

## Specificity Assessment

- **Specific enough to implement?** Yes -- all 14 requirements have concrete GIVEN/WHEN/THEN scenarios tied to the implementation.
- **Open questions:**
  - Should there be a true v2-to-v1 runtime fallback mechanism (try v2, on failure retry with v1)?
  - Should `itemMenu` be configurable via a prop instead of hardcoded to `false`?
  - Should widget buttons (`widget.buttons`) be rendered (currently unused)?
