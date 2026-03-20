---
status: reviewed
---

# Schema Utilities — Spec

## Purpose
Specifies the utility functions that auto-generate table columns, form fields, and filter definitions from JSON Schema properties, plus helper utilities for value formatting, HTTP headers, query strings, and error parsing.

**Files**: `src/utils/schema.js`, `src/utils/headers.js`, `src/utils/errors.js`, `src/utils/id.js`

---

## Requirements

### REQ-SU-001: columnsFromSchema — Table Column Generation

The `columnsFromSchema` function MUST generate table column definitions from JSON Schema properties with support for filtering, sorting, and overrides.

#### Scenario: Basic column generation

- GIVEN a schema with properties `title` (string), `status` (string, enum), `created` (string, format: date-time)
- WHEN `columnsFromSchema(schema)` is called
- THEN it MUST return an array of column objects with `key`, `label`, `sortable`, `type`, `format`, `width`
- AND `label` MUST come from `prop.title` or the raw property key as fallback
- AND `sortable` MUST default to `true` for all columns
- AND `type` MUST default to `'string'` when `prop.type` is absent
- AND `format` MUST default to `null` when `prop.format` is absent
- AND columns MUST be sorted by `prop.order` (ascending), then alphabetically by key for equal/missing order

#### Scenario: Filtering

- GIVEN a property with `visible: false`
- THEN it MUST be excluded from columns
- AND properties with `type: 'object'` MUST be excluded
- AND `exclude` option MUST remove specified keys
- AND `include` option MUST whitelist only specified keys
- AND when both `exclude` and `include` are provided, both filters apply

#### Scenario: Column overrides

- GIVEN `options.overrides = { status: { label: 'State', width: '200px' } }`
- THEN the `status` column MUST use the overridden label and width
- AND overrides MUST be applied via `Object.assign` after all other properties are set

#### Scenario: Enum and items passthrough

- GIVEN a property with `enum: ['active', 'inactive']`
- THEN the column object MUST include `enum: ['active', 'inactive']`
- AND given a property with `items: { type: 'string' }`
- THEN the column object MUST include `items: { type: 'string' }`

### REQ-SU-002: columnsFromSchema — Default Width Assignment

The `columnsFromSchema` function MUST assign default column widths based on property type and format via the `DEFAULT_WIDTHS` map.

#### Scenario: Type-based default widths

- GIVEN properties of various types
- WHEN `columnsFromSchema(schema)` generates columns
- THEN it MUST assign default widths from the `DEFAULT_WIDTHS` map:
  - `boolean` -> `'80px'`
  - `integer` -> `'100px'`
  - `number` -> `'100px'`
  - `string` with format `uuid` -> `'140px'`
  - `string` with format `date-time` -> `'180px'`
  - `string` with format `email` -> `'200px'`
- AND properties not matching any entry MUST NOT have a `width` property set
- AND override widths MUST take precedence over defaults

---

### REQ-SU-003: fieldsFromSchema — Form Field Generation

The `fieldsFromSchema` function MUST generate form field definitions from JSON Schema properties with widget resolution, validation constraints, and override support.

#### Scenario: Basic field generation

- GIVEN a schema with properties `title` (string, required), `count` (integer), `active` (boolean)
- WHEN `fieldsFromSchema(schema)` is called
- THEN it MUST return field objects with `key`, `label`, `description`, `type`, `format`, `widget`, `required`, `readOnly`, `default`, `enum`, `items`, `validation`, `order`
- AND `required` MUST be `true` when the key is in `schema.required` array
- AND `required` MUST be `false` when `schema.required` is absent or not an array
- AND `description` MUST come from `prop.description` or default to empty string
- AND `default` MUST come from `prop.default` or default to `null`
- AND fields MUST be sorted by `prop.order` (ascending), then alphabetically by key

#### Scenario: ReadOnly filtering

- GIVEN a property with `readOnly: true`
- WHEN `fieldsFromSchema(schema)` is called without `includeReadOnly`
- THEN the property MUST be excluded
- AND with `options.includeReadOnly = true` it MUST be included with `readOnly: true` on the field

#### Scenario: Visible and object filtering

- GIVEN a property with `visible: false`
- THEN it MUST be excluded from fields
- AND properties with `type: 'object'` MUST be excluded

#### Scenario: Field overrides

- GIVEN `options.overrides = { status: { widget: 'select', enum: ['a', 'b'] } }`
- THEN the `status` field MUST use the overridden widget and enum values
- AND overrides MUST be applied via `Object.assign` after all other properties are set

### REQ-SU-004: fieldsFromSchema — Widget Resolution

The `resolveWidget` function MUST map schema property types and formats to UI widget identifiers following a defined priority chain.

#### Scenario: Widget resolution priority chain

- GIVEN various schema property definitions
- THEN widget resolution MUST follow this priority (first match wins):
  1. Explicit `prop.widget` -> use as-is (custom widget passthrough)
  2. `prop.enum` -> `'select'`
  3. `type: 'boolean'` -> `'checkbox'`
  4. `type: 'integer'` or `'number'` -> `'number'`
  5. `type: 'array'` with `items.enum` -> `'multiselect'`
  6. `type: 'array'` without `items.enum` -> `'tags'`
  7. `format: 'date-time'` -> `'datetime'`
  8. `format: 'date'` -> `'date'`
  9. `format: 'email'` -> `'email'`
  10. `format: 'uri'` or `'url'` -> `'url'`
  11. `format: 'markdown'` or `'textarea'` -> `'textarea'`
  12. `maxLength > 255` -> `'textarea'`
  13. Default -> `'text'`

### REQ-SU-005: fieldsFromSchema — Validation Constraints

Each generated field MUST include a `validation` object populated from the schema property's constraint annotations.

#### Scenario: Validation object population

- GIVEN a property with `minLength: 3`, `maxLength: 100`, `minimum: 0`, `maximum: 999`, `pattern: '^[a-z]+$'`
- THEN the field's `validation` object MUST contain all five keys: `{ minLength: 3, maxLength: 100, minimum: 0, maximum: 999, pattern: '^[a-z]+$' }`
- AND when a constraint is absent from the property, its key MUST be `undefined` in the validation object
- AND the validation object MUST always be present (never null)

---

### REQ-SU-006: filtersFromSchema — Faceted Filter Generation

The `filtersFromSchema` function MUST generate filter definitions only for schema properties with `facetable: true`.

#### Scenario: Facetable property filtering

- GIVEN a schema with properties where some have `facetable: true` and others do not
- WHEN `filtersFromSchema(schema)` is called
- THEN it MUST return filter definitions ONLY for properties with `facetable: true`
- AND each filter MUST have `key`, `label`, `description`, `type`, `propertyType`, `options`, `value`
- AND `value` MUST default to `null`
- AND filters MUST be sorted by `prop.order` (ascending), then alphabetically by key

#### Scenario: Filter type detection from property type

- GIVEN a facetable boolean property
- THEN the filter type MUST be `'checkbox'`
- AND given a facetable property with `enum: ['a', 'b', 'c']`
- THEN the filter type MUST be `'select'`
- AND `options` MUST be mapped to `[{ id: 'a', label: 'a' }, { id: 'b', label: 'b' }, { id: 'c', label: 'c' }]`
- AND given a facetable property without enum and not boolean
- THEN the filter type MUST default to `'select'` with empty `options` (populated dynamically via facet API)

---

### REQ-SU-007: formatValue — Cell Value Formatting

The `formatValue` function MUST format cell values for display based on the property type and format, with type-specific rendering rules.

#### Scenario: Null and empty handling

- GIVEN a value that is `null`, `undefined`, or empty string `''`
- WHEN `formatValue(value, property)` is called
- THEN it MUST return the em-dash character `'—'`

#### Scenario: Boolean formatting

- GIVEN a boolean value `true`
- THEN it MUST return the checkmark character `'✓'`
- AND given `false` it MUST return `'—'`
- AND type detection MUST work both from `property.type === 'boolean'` and from `typeof value === 'boolean'`

#### Scenario: Number formatting

- GIVEN an integer or number value
- THEN it MUST return `num.toLocaleString()` for locale-aware formatting
- AND given `NaN` after Number conversion, it MUST return `String(value)` as fallback

#### Scenario: Array formatting with truncation

- GIVEN an array value
- WHEN the array has 0 items, it MUST return `'—'`
- AND when the array has 1-3 items, it MUST return items joined with `', '`
- AND when the array has more than 3 items, it MUST return the first 3 joined with `', '` followed by ` +N` where N is the remaining count
- AND given `type: 'array'` but a non-array value, it MUST return `String(value)`

#### Scenario: Date-time formatting

- GIVEN a string value with `format: 'date-time'`
- THEN it MUST parse to a Date and format as `DD/MM/YYYY, HH:MM:SS` using `toLocaleDateString` + `toLocaleTimeString`
- AND given `format: 'date'` it MUST format as `DD/MM/YYYY` only
- AND given an invalid date string, it MUST return the original string (not throw)

#### Scenario: UUID truncation

- GIVEN a string value with `format: 'uuid'` longer than 8 characters
- THEN it MUST return the first 8 characters followed by `'...'`
- AND given a UUID of 8 characters or less, it MUST return as-is

#### Scenario: URI hostname extraction

- GIVEN a string value with `format: 'uri'` or `'url'`
- THEN it MUST parse with `new URL()` and return `hostname + pathname.substring(0, 20)`
- AND given an invalid URL, it MUST fall back to string truncation

#### Scenario: Markdown stripping

- GIVEN a string value with `format: 'markdown'`
- THEN it MUST strip headings (`#`), bold/italic (`*`, `_`), links (`[text](url)`), inline code, and newlines
- AND truncate the result to the `truncate` option length (default 100)

#### Scenario: Email passthrough

- GIVEN a string value with `format: 'email'`
- THEN it MUST return the email string as-is without truncation

#### Scenario: Plain string truncation

- GIVEN a plain string value exceeding the `truncate` option (default 100)
- THEN it MUST truncate to `truncate` characters and append `'...'`
- AND given `options.truncate = 50` it MUST truncate at 50 characters

#### Scenario: Object fallback

- GIVEN a value that is a non-null object (and not an array)
- THEN it MUST return the string `'[Object]'`

---

### REQ-SU-008: buildHeaders — HTTP Request Headers

The `buildHeaders` function MUST return standard Nextcloud API headers including the CSRF request token and OCS API request flag.

#### Scenario: Standard Nextcloud headers

- WHEN `buildHeaders()` is called with no arguments
- THEN it MUST return an object with `requesttoken` set to `OC.requestToken`
- AND `'OCS-APIREQUEST'` set to `'true'`
- AND `'Content-Type'` set to `'application/json'`

#### Scenario: Custom content type

- GIVEN `buildHeaders('multipart/form-data')`
- THEN `'Content-Type'` MUST be `'multipart/form-data'`
- AND given `buildHeaders(null)` the `'Content-Type'` header MUST be omitted (for FormData uploads)

---

### REQ-SU-009: buildQueryString — URL Query Construction

The `buildQueryString` function MUST construct a URL query string from a params object, handling arrays, objects, and null values.

#### Scenario: Basic key-value pairs

- GIVEN `buildQueryString({ page: 1, search: 'test' })`
- THEN it MUST return a string starting with `'?'` containing `page=1` and `search=test`

#### Scenario: Null/empty value skipping

- GIVEN params with values that are `null`, `undefined`, or empty string
- THEN those keys MUST be omitted from the query string

#### Scenario: Array parameter handling

- GIVEN `buildQueryString({ tags: ['a', 'b'] })`
- THEN it MUST append multiple entries: `tags=a&tags=b`
- AND null/undefined/empty items within arrays MUST be skipped

#### Scenario: Object parameter serialization

- GIVEN `buildQueryString({ _order: { title: 'asc' } })`
- THEN it MUST serialize the object value via `JSON.stringify`

#### Scenario: Empty result

- GIVEN an empty params object or all values null/empty
- THEN it MUST return an empty string (not `'?'`)

---

### REQ-SU-010: parseResponseError — Error Response Parsing

The `parseResponseError` function MUST parse HTTP error responses into structured `ApiError` objects with status-specific messages and validation field extraction.

#### Scenario: Validation error (400/422)

- GIVEN an HTTP response with status 400 or 422
- WHEN `parseResponseError(response, 'object')` is called
- THEN it MUST return an `ApiError` with `isValidation: true`
- AND `fields` populated from `body.validationErrors` or `body.errors`
- AND `message` from the body string details or fallback `'Validation failed for object'`

#### Scenario: Status-specific messages

- GIVEN status 401, it MUST return message `'Session expired, please log in again'`
- AND status 403: `'You do not have permission to perform this action'`
- AND status 404: `'The requested {type} could not be found'`
- AND status 409: `'This {type} was modified by another user. Please reload.'`
- AND status >= 500: `'An unexpected server error occurred. Please try again.'`
- AND all non-validation errors MUST have `isValidation: false`

#### Scenario: Non-JSON response body

- GIVEN a response whose body is not valid JSON
- THEN `details` and `fields` MUST be `null` (not throw)

#### Scenario: ApiError toString

- GIVEN any `ApiError` returned by `parseResponseError`, `networkError`, or `genericError`
- THEN calling `toString()` on it MUST return the `message` string

---

### REQ-SU-011: Edge Cases — Empty and Invalid Schemas

All schema utility functions MUST handle null, undefined, or empty schemas gracefully by returning empty arrays.

#### Scenario: Null or missing schema

- GIVEN `schema` is `null`, `undefined`, or has no `properties` key
- WHEN `columnsFromSchema`, `fieldsFromSchema`, or `filtersFromSchema` is called
- THEN it MUST return an empty array `[]` (not throw)

#### Scenario: Properties with missing type

- GIVEN a property that lacks a `type` field
- THEN `columnsFromSchema` MUST default `type` to `'string'`
- AND `fieldsFromSchema` MUST default `type` to `'string'`
- AND `resolveWidget` MUST treat missing type as `'string'`

#### Scenario: Empty properties object

- GIVEN `schema.properties` is an empty object `{}`
- WHEN any schema utility is called
- THEN it MUST return an empty array `[]`

---

### REQ-SU-012: Options Parameter — Include/Exclude Consistency

The `columnsFromSchema` and `fieldsFromSchema` functions MUST support consistent `include` and `exclude` filtering via their options parameter.

#### Scenario: Include and exclude across all schema functions

- GIVEN `options.include = ['title', 'status']` and `options.exclude = ['status']`
- WHEN `columnsFromSchema(schema, options)` or `fieldsFromSchema(schema, options)` is called
- THEN only `title` MUST be returned (exclude takes effect on the include-filtered set)

#### Scenario: filtersFromSchema has no options parameter

- GIVEN `filtersFromSchema(schema)` currently accepts no options
- THEN it MUST filter solely based on `facetable: true` on each property
- AND this is an identified gap — a future enhancement could add include/exclude/isAdmin options

---

### REQ-SU-013: prefixUrl — Index.php Path Detection

The `prefixUrl` function MUST detect whether the current page is served via `index.php` and prefix API paths accordingly.

#### Scenario: Path already has index.php

- GIVEN `prefixUrl('/index.php/apps/openregister/api/objects')`
- THEN it MUST return the path unchanged

#### Scenario: Browser served via index.php

- GIVEN the current `window.location.pathname` contains `/index.php`
- AND `prefixUrl('/apps/openregister/api/objects')` is called
- THEN it MUST return `'/index.php/apps/openregister/api/objects'`

#### Scenario: Direct URL (no index.php)

- GIVEN `window.location.pathname` does NOT contain `/index.php`
- THEN `prefixUrl('/apps/openregister/api/objects')` MUST return the path unchanged

---

### REQ-SU-014: extractId — ID Extraction from Values

The `extractId` function MUST extract an ID from string values, objects with `.id`, and objects with `@self.id`.

#### Scenario: String value

- GIVEN a plain string value `'abc-123'`
- WHEN `extractId(value)` is called
- THEN it MUST return `'abc-123'`

#### Scenario: Object with id property

- GIVEN an object `{ id: '123', name: 'Test' }`
- THEN `extractId` MUST return `'123'`

#### Scenario: Object with @self.id property

- GIVEN an object `{ '@self': { id: '456' } }`
- THEN `extractId` MUST return `'456'`

#### Scenario: Fallback

- GIVEN a value that is not a string and has no `id` or `@self.id`
- THEN `extractId` MUST return the value as-is

---

### REQ-SU-015: networkError and genericError — Error Factories

The `networkError` and `genericError` factory functions MUST create standardized `ApiError` objects for network failures and generic exceptions.

#### Scenario: networkError creation

- GIVEN a caught `Error` with `message: 'Failed to fetch'`
- WHEN `networkError(error)` is called
- THEN it MUST return an `ApiError` with `status: 0`, `isValidation: false`, and the error message
- AND given an error without a message, it MUST use the fallback `'A network error occurred. Check your connection and try again.'`

#### Scenario: genericError creation

- GIVEN a caught `Error` with `message: 'Something went wrong'`
- WHEN `genericError(error)` is called
- THEN it MUST return an `ApiError` with `status: null`, `isValidation: false`, and the error message

---

## ADDED Requirements

### Requirement: REQ-SU-A01 — Performance with Large Schemas

All schema utility functions MUST complete within acceptable time and memory bounds for schemas with 100+ properties.

#### Scenario: Schema with 100+ properties

- GIVEN a schema with 150 properties, each with type, format, order, and various constraints
- WHEN `columnsFromSchema`, `fieldsFromSchema`, or `filtersFromSchema` is called
- THEN all three functions MUST complete within 10ms on a modern browser
- AND memory allocation MUST be proportional to the number of output entries (not quadratic)

### Requirement: REQ-SU-A02 — Barrel Export Completeness

All public utility functions MUST be re-exported through the barrel chain so consumers can import from the package root.

#### Scenario: All utilities exported from barrel

- GIVEN the barrel file `src/utils/index.js`
- THEN it MUST re-export: `buildHeaders`, `buildQueryString`, `parseResponseError`, `networkError`, `genericError`, `columnsFromSchema`, `formatValue`, `filtersFromSchema`, `fieldsFromSchema`
- AND the main barrel `src/index.js` MUST re-export these so consumer apps can import from `@conduction/nextcloud-vue`

---

## Current Implementation Status

**Already implemented — all requirements are fulfilled:**

- **`src/utils/schema.js`**: `columnsFromSchema`, `fieldsFromSchema`, `filtersFromSchema`, `formatValue` — all fully implemented with filtering, sorting, overrides, widget resolution, and edge case handling.
- **`src/utils/headers.js`**: `prefixUrl`, `buildHeaders`, `buildQueryString` — fully implemented with index.php detection, CSRF token injection, and array/object query parameter handling.
- **`src/utils/errors.js`**: `parseResponseError`, `networkError`, `genericError` — fully implemented with status-specific messages, validation detection, field extraction, and `toString()` support.
- **`src/utils/id.js`**: `extractId` — fully implemented with string, object.id, and @self.id support.
- **`src/utils/index.js`**: Barrel re-exports all schema and header/error utilities.
- **Edge cases**: All functions return empty array or safe defaults for null/missing input.

**Not yet implemented:**

- `filtersFromSchema` does not accept an `options` parameter for `include`/`exclude`/`isAdmin` filtering (REQ-SU-012 gap).
- `extractId` is not re-exported from the utils barrel (`src/utils/index.js`).

## Standards & References

- JSON Schema vocabulary (type, format, enum, required, readOnly, minLength, maxLength, minimum, maximum, pattern)
- OpenRegister custom extensions: `visible`, `facetable`, `order`, `widget`, `adminOnly`
- Intl API for locale-aware date/number formatting (`toLocaleDateString`, `toLocaleTimeString`, `toLocaleString`)
- Nextcloud CSRF token via `OC.requestToken`
- OCS API request header convention

## Specificity Assessment

- **Specific enough to implement?** Yes — every function is fully specified with input/output shapes, priority chains, edge cases, and formatting rules.
- **Gaps identified:**
  - `filtersFromSchema` lacks an `options` parameter matching `columnsFromSchema`/`fieldsFromSchema` for consistency.
  - `extractId` is not included in the utils barrel export.
  - `prefixUrl` is exported from `headers.js` but not re-exported from `utils/index.js`.
- **Consumer usage:** OpenRegister and Pipelinq define local `formatValue` helpers in their views rather than importing the shared utility — migration to the shared function would reduce duplication.
