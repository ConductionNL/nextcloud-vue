# formatValue

Formats a raw value into a display string based on the schema property describing it. Designed for table cells — handles nulls, dates, booleans, arrays, numbers, UUIDs, URIs, and markdown.

## Signature

```js
import { formatValue } from '@conduction/nextcloud-vue'

formatValue(42, { type: 'integer' })                         // "42"
formatValue(1500, { type: 'number' })                        // "1,500"  (uses toLocaleString)
formatValue(true, { type: 'boolean' })                       // "✓"
formatValue(false, { type: 'boolean' })                      // "—"
formatValue('2026-01-15T10:30:00Z', { type: 'string', format: 'date-time' })
// "15/01/2026, 10:30:00"  (locale-dependent)
formatValue('2026-01-15', { type: 'string', format: 'date' })
// "15/01/2026"
formatValue(['a', 'b', 'c', 'd', 'e'], { type: 'array' })    // "a, b, c +2"
formatValue('ff14c8a0-5d2f-4f11-b08c-55c8f0b6a8f3', { type: 'string', format: 'uuid' })
// "ff14c8a0..."
formatValue(null)                                            // "—"
```

## Parameters

| Arg | Type | Default | Description |
|-----|------|---------|-------------|
| `value` | `any` | — | Raw value to format. |
| `property` | `object` | `{}` | Schema property descriptor. Only `type`, `format`, `enum`, `items` are consulted. |
| `options.truncate` | `number` | `100` | Maximum length for string output before adding `'...'`. Applied to plain strings, URIs, and markdown. |

## Behaviour

| Condition | Output |
|-----------|--------|
| `null`, `undefined`, `''` | `'—'` |
| `boolean` or `type: 'boolean'` | `'✓'` / `'—'` |
| `integer` / `number` | `Number(value).toLocaleString()`; `String(value)` when `NaN` |
| `array` (type or actual) | `length === 0` → `'—'`; `<= 3` → `join(', ')`; more → `"a, b, c +N"` |
| `object` | `'[Object]'` |
| `format: 'date-time'` | `toLocaleDateString + ', ' + toLocaleTimeString` |
| `format: 'date'` | `toLocaleDateString` (day-month-year) |
| `format: 'uuid'` | first 8 chars + `'...'` |
| `format: 'uri'` / `'url'` | `hostname + first 20 chars of pathname`; truncated raw string on parse failure |
| `format: 'markdown'` | strips headings, bold/italic, links, code, newlines; then truncates |
| `format: 'email'` | string as-is, no truncation |
| plain string | truncated at `options.truncate` |

## Notes

- Date strings that fail `new Date()` parsing are returned verbatim.
- The function never throws — malformed URIs and dates fall back to truncated raw strings.

## Related

- [columnsFromSchema](./columns-from-schema.md) — Provides the property descriptor used here.
- [CnCellRenderer](../components/cn-cell-renderer.md) — Typical caller inside tables.
