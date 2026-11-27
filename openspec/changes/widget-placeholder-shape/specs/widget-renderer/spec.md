# widget-renderer Delta: widget-placeholder-shape

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [widget-placeholder-shape](../../)

## Purpose

`CnWidgetRenderer` reports when its first load has settled, and leaves drawing the waiting state to the wrapper.

## REMOVED Requirements

### Requirement: loading state

**Reason**: the renderer no longer draws a spinner for its first fetch; the wrapper draws the widget's declared
placeholder (widget-placeholder).
**Migration**: hosts set `CnWidgetWrapper`'s `loading` until the renderer emits `loaded`, as the requirement below says.

## ADDED Requirements

### Requirement: The renderer reports its first load

CnWidgetRenderer SHALL emit `loaded` exactly once, when its first fetch of items settles with success, an empty result
or an error. It SHALL NOT draw a spinner for that first fetch; its host's `CnWidgetWrapper` draws the widget's
placeholder until `loaded`. For a later fetch (auto-refresh or a manual refresh) it SHALL keep the items it shows until
the new ones arrive, and SHALL NOT emit `loaded` again.

#### Scenario: loaded is emitted when the first fetch completes

- GIVEN the component has mounted and is fetching items
- WHEN the API request completes, with items, with none or with an error
- THEN the component emits `loaded` once
- AND no loading spinner was drawn while it waited

#### Scenario: a refresh does not empty the widget

- GIVEN the component shows items and its reload interval elapses
- WHEN the refresh request is in progress
- THEN the current items stay visible and `loaded` is not emitted again
