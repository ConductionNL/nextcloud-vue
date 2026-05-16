# validateValue

Validates a single value against a JSON-Schema-style property definition and returns either `null` (valid) or a short English error message describing the violation.

Designed for inline form validation — used by `CnPropertyValueCell` to surface
errors under each input, and by parent forms to gate submission. The returned
message is in English; localize with the app's translation function before
rendering to the user.

## Signature

```js
import { validateValue } from '@conduction/nextcloud-vue'

validateValue('hi', { type: 'string', minLength: 3 })
// "Must be at least 3 characters."

validateValue(42, { type: 'integer', maximum: 10 })
// "Value must be at most 10."

validateValue('not-an-email', { type: 'string', format: 'email' })
// "Value must be a valid 'email'."

validateValue('', { type: 'string' }, { required: true })
// "This field is required."

validateValue(null, { type: 'string' })
// null  (empty values are valid unless required)
```

## Parameters

| Arg | Type | Default | Description |
|-----|------|---------|-------------|
| `value` | `any` | — | Value to validate. |
| `property` | `object` | `{}` | Schema property definition (`type`, `format`, `minLength`, `maxLength`, `minimum`, `maximum`, `pattern`, `const`, `enum`, `items`, `minItems`, `maxItems`). |
| `options.required` | `boolean` | `false` | When `true`, an empty value (`null` / `undefined` / `''` / empty array) reports `'This field is required.'`. |

## Checks performed

| Type | Constraints |
|------|-------------|
| `integer` | Must be a JS integer; respects `minimum`, `maximum`. |
| `number` | Must be a finite number; respects `minimum`, `maximum`. |
| `string` | Respects `minLength`, `maxLength`, `pattern`, `const`, and the `format` checks below. |
| `array` | Must be an `Array`; respects `minItems`, `maxItems`. |
| `boolean` | Must be a JS boolean. |
| any | When `enum` is present, value must be in the list. |

## String formats

URL-shaped formats (`url`, `uri`, `iri`, etc.) must parse with `new URL()`.
Date formats (`date`, `date-time`, `time`) must parse with `new Date()`.
Other recognised formats: `email`, `idn-email`, `uuid`, `ipv4`, `ipv6`, `hostname`, `semver`, and the seven color formats (`color-hex`, `color-hex-alpha`, `color-rgb`, `color-rgba`, `color-hsl`, `color-hsla`).

## Notes

- An empty value (`''`, `null`, `undefined`, empty array) is treated as valid unless `required: true`.
- Returns the *first* failure encountered — fix one error at a time.
- Messages are intentionally short and English; pass them through `t(...)` for translation.

## Related

- [formatValue](./format-value.md) — The display-side counterpart.
- [CnPropertyValueCell](../components/cn-property-value-cell.md) — Renders inline errors using this util.
