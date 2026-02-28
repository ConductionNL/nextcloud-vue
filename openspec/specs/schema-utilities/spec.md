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
