---
sidebar_position: 1
---

# Utilities

Helper functions exported by the library.

## Schema Utilities

### columnsFromSchema

Generates table column definitions from a schema.

```js
import { columnsFromSchema } from '@conduction/nextcloud-vue'

const columns = columnsFromSchema(schema, options?)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `schema` | Object | OpenRegister schema |
| `options.exclude` | Array | Property keys to exclude |
| `options.include` | Array | Property keys to include (whitelist) |
| `options.overrides` | Object | Per-column overrides |

Returns: `Array<\{ key, label, sortable, type, format, width? \}>`

### filtersFromSchema

Generates filter definitions from schema properties.

```js
import { filtersFromSchema } from '@conduction/nextcloud-vue'

const filters = filtersFromSchema(schema)
```

Returns filter definitions for enum, boolean, and facetable properties.

### fieldsFromSchema

Generates form field definitions from schema properties.

```js
import { fieldsFromSchema } from '@conduction/nextcloud-vue'

const fields = fieldsFromSchema(schema, options?)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `schema` | Object | OpenRegister schema |
| `options.exclude` | Array | Property keys to exclude |
| `options.include` | Array | Property keys to include |
| `options.overrides` | Object | Per-field overrides |

Returns: `Array<\{ key, label, type, widget, required, options?, default? \}>`

## HTTP Utilities

### buildHeaders

Builds HTTP headers for OpenRegister API requests.

```js
import { buildHeaders } from '@conduction/nextcloud-vue'

const headers = buildHeaders(options?)
```

Returns headers object with `Content-Type`, CSRF token, and authentication.

### buildQueryString

Builds a URL query string from an options object.

```js
import { buildQueryString } from '@conduction/nextcloud-vue'

const qs = buildQueryString({ page: 1, limit: 20, _search: 'test' })
// "?page=1&limit=20&_search=test"
```

## Display Utilities

### formatValue

Formats a value for display based on its schema type.

```js
import { formatValue } from '@conduction/nextcloud-vue'

formatValue('2025-01-15T10:30:00Z', { type: 'string', format: 'date-time' })
// "15 Jan 2025 10:30"

formatValue(true, { type: 'boolean' })
// "Yes"

formatValue(1500.5, { type: 'number', format: 'currency' })
// "€1,500.50"
```

## Error Utilities

### parseApiError

Parses API error responses into user-friendly messages.

```js
import { parseApiError } from '@conduction/nextcloud-vue'

try {
  await store.createObject('contact', data)
} catch (e) {
  const message = parseApiError(e)
  // "Validation failed: email is required"
}
```

### isNetworkError

Checks if an error is a network connectivity issue.

```js
import { isNetworkError } from '@conduction/nextcloud-vue'

if (isNetworkError(error)) {
  showToast('Connection lost. Please check your network.')
}
```
