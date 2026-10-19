# nc-widget Delta: nc-widget-exclude-apps

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [nc-widget-exclude-apps](../../)

## Purpose

Let a placed Nextcloud widget leave out the items of some apps or types.

## ADDED Requirements

### Requirement: A Nextcloud widget can leave out items of an app or type

With `content.excludeApps` or `content.excludeTypes`, CnNcWidgetWidget SHALL read its items from the items API (not the native callback) and SHALL NOT draw an item whose app (its `app`, else the `/apps/<app>/` part of its link or icon URLs) or type (`type` or `objectType`) is listed, case-insensitively. It SHALL ask the API for more items than its `limit` so the limit still fills. Without the keys it SHALL render as before.

#### Scenario: Recent activity without tags

- **GIVEN** the activity widget placed with `excludeApps: ["systemtags"]` and `limit: 2`
- **WHEN** the feed's first item is a system-tag entry
- **THEN** the widget shows the next two items
