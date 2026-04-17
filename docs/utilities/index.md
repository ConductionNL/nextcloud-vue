---
sidebar_position: 7
---

# Utilities

Helper functions exported by `@conduction/nextcloud-vue`. Each function has its own reference page.

## HTTP

| Function | Purpose |
|----------|---------|
| [buildHeaders](./build-headers.md) | Build Nextcloud OCS request headers (CSRF token + flags) |
| [buildQueryString](./build-query-string.md) | Serialise a params object into a URL query string |

## Errors

All three error helpers return the same `ApiError` shape so consumers can surface them uniformly regardless of source.

| Function | Use when |
|----------|----------|
| [parseResponseError](./parse-response-error.md) | `response.ok === false` — an HTTP response *was* received |
| [networkError](./network-error.md) | `fetch` threw a `TypeError` — no response (offline/DNS/CORS) |
| [genericError](./generic-error.md) | Any other caught exception |

## Schema

Helpers that derive UI structure from an OpenRegister / JSON Schema.

| Function | Purpose |
|----------|---------|
| [columnsFromSchema](./columns-from-schema.md) | Generate `CnDataTable` column definitions |
| [filtersFromSchema](./filters-from-schema.md) | Generate filter definitions from `facetable` properties |
| [fieldsFromSchema](./fields-from-schema.md) | Generate form field descriptors (widget, validation, required) |
| [formatValue](./format-value.md) | Format a raw value for display using a property descriptor |

## Widget visibility

Used by the dashboard composable and any custom widget loader that wants the same user/group visibility rules.

| Function | Purpose |
|----------|---------|
| [filterWidgetsByVisibility](./filter-widgets-by-visibility.md) | Async filter of widget definitions for the current user |
| [isWidgetVisible](./is-widget-visible.md) | Sync predicate for a single widget |
| [getCurrentUserId](./get-current-user-id.md) | Read `OC.currentUser` |
| [getCurrentUserGroups](./get-current-user-groups.md) | Fetch (and cache) the current user's groups |
| [resetVisibilityCache](./reset-visibility-cache.md) | Clear the cached groups |

## Composables

Vue 3 composables live under [utilities/composables/](./composables/index.md).
