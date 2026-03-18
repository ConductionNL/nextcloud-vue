# Schema Utilities — Spec

## Purpose
Specifies the utility functions that auto-generate table columns, form fields, and filter definitions from JSON Schema properties.

**File**: `src/utils/schema.js`

---

## Requirements

### REQ-SU-001: columnsFromSchema — Table Column Generation

#### Scenario: Basic column generation

- GIVEN a schema with properties `title` (string), `status` (string, enum), `created` (string, format: date-time)
- WHEN `columnsFromSchema(schema)` is called
- THEN it MUST return an array of column objects with `key`, `label`, `sortable`, `type`, `format`, `width`
- AND `label` MUST come from `prop.title` or humanized key
- AND columns MUST be sorted by `prop.order` (ascending)

#### Scenario: Filtering

- GIVEN a property with `visible: false`
- THEN it MUST be excluded from columns
- AND properties with `type: 'object'` MUST be excluded
- AND `exclude` option MUST remove specified keys
- AND `include` option MUST whitelist only specified keys

#### Scenario: Column overrides

- GIVEN `options.overrides = { status: { label: 'State', width: '200px' } }`
- THEN the `status` column MUST use the overridden label and width

### REQ-SU-002: fieldsFromSchema — Form Field Generation

#### Scenario: Basic field generation

- GIVEN a schema with properties `title` (string, required), `count` (integer), `active` (boolean)
- WHEN `fieldsFromSchema(schema)` is called
- THEN it MUST return field objects with `key`, `label`, `description`, `type`, `format`, `widget`, `required`, `readOnly`, `default`, `enum`, `items`, `validation`, `order`
- AND `required` MUST be true when the key is in `schema.required`
- AND fields MUST be sorted by `prop.order` (ascending)

#### Scenario: ReadOnly filtering

- GIVEN a property with `readOnly: true`
- WHEN `fieldsFromSchema(schema)` is called without `includeReadOnly`
- THEN the property MUST be excluded
- AND with `options.includeReadOnly = true` it MUST be included

#### Scenario: Widget resolution

- GIVEN various schema property definitions
- THEN widget resolution MUST follow this priority:
  1. Explicit `prop.widget` → use as-is
  2. `prop.enum` → `'select'`
  3. `type: 'boolean'` → `'checkbox'`
  4. `type: 'integer'` or `'number'` → `'number'`
  5. `type: 'array'` with `items.enum` → `'multiselect'`
  6. `type: 'array'` → `'tags'`
  7. `format: 'date-time'` → `'datetime'`
  8. `format: 'date'` → `'date'`
  9. `format: 'email'` → `'email'`
  10. `format: 'uri'` or `'url'` → `'url'`
  11. `format: 'markdown'` or `'textarea'` → `'textarea'`
  12. `maxLength > 255` → `'textarea'`
  13. Default → `'text'`

#### Scenario: Validation constraints

- GIVEN a property with `minLength: 3`, `maxLength: 100`
- THEN the field's `validation` object MUST contain `{ minLength: 3, maxLength: 100 }`
- AND `minimum`, `maximum`, `pattern` MUST be included when present

### REQ-SU-003: filtersFromSchema — Filter Generation

#### Scenario: Filter generation

- GIVEN a schema with properties that have `enum` or are filterable
- WHEN `filtersFromSchema(schema)` is called
- THEN it MUST return filter definitions suitable for CnFilterBar or CnFacetSidebar

### REQ-SU-004: formatValue — Cell Value Formatting

#### Scenario: Type-aware formatting

- GIVEN a value and format `'date-time'`
- THEN it MUST return a formatted locale date string
- AND boolean values MUST render as checkmark/cross
- AND null/undefined MUST render as empty string

### REQ-SU-005: Edge Cases

#### Scenario: Null or invalid schema

- GIVEN `schema` is null or has no `properties`
- WHEN any schema utility is called
- THEN it MUST return an empty array (not throw)

---

### Current Implementation Status

**Already implemented — all requirements are fulfilled:**

- **File**: `src/utils/schema.js`
- **`columnsFromSchema(schema, options)`**: Fully implemented. Filters `visible: false` and `type: 'object'`. Supports `exclude`, `include`, `overrides`. Sorts by `prop.order` then alphabetically. Returns `{ key, label, sortable, type, format, width, enum, items }`. Default widths defined in `DEFAULT_WIDTHS` map.
- **`fieldsFromSchema(schema, options)`**: Fully implemented. Supports `exclude`, `include`, `overrides`, `includeReadOnly`. Sorts by `prop.order`. Returns `{ key, label, description, type, format, widget, required, readOnly, default, enum, items, validation, order }`. Widget resolution via internal `resolveWidget()` follows the exact priority chain in the spec.
- **`filtersFromSchema(schema)`**: Fully implemented. Filters properties with `facetable: true`. Maps boolean to `'checkbox'`, enum to `'select'` with options, others to `'select'` with dynamic options. Sorts by order.
- **`formatValue(value, property, options)`**: Fully implemented. Handles null/undefined (returns `'—'`), booleans (checkmark/dash), numbers (locale string), arrays (join or "+N"), dates (locale formatted), UUIDs (truncated), URIs, markdown (stripped), emails, and plain strings with truncation.
- **Edge cases**: All functions return empty array for null/missing schema.

**Not yet implemented:**
- All spec requirements are implemented. No gaps identified.

### Standards & References

- JSON Schema vocabulary (type, format, enum, required, readOnly, minLength, maxLength, minimum, maximum, pattern)
- OpenRegister custom extensions: `visible`, `facetable`, `order`, `widget`, `adminOnly`
- Intl API for locale-aware date/number formatting

### Specificity Assessment

- **Specific enough to implement?** Yes — the spec is highly specific with exact widget resolution priority and edge case handling. Already fully implemented.
- **Missing/ambiguous:**
  - REQ-SU-003 (`filtersFromSchema`) is underspecified compared to the actual implementation — it does not mention `facetable: true` filtering, property type to filter widget mapping, or the sort order.
  - REQ-SU-004 (`formatValue`) does not mention UUID truncation, URI hostname extraction, markdown stripping, array truncation ("+N"), or the `truncate` option.
  - The spec does not mention `DEFAULT_WIDTHS` for auto-width assignment in `columnsFromSchema`.
- **Open questions:**
  - Should `filtersFromSchema` accept an `options` parameter for `isAdmin` RBAC filtering? The CnIndexSidebar passes `{ isAdmin }` but the current function signature does not use it.
