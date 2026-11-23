# Design: form-live-values

Read at nextcloud-vue development `c8aa85863`.

## What is there

- `CnFormPage` copies `initialValue` into `formData` (`cloneInitial`,
  `src/components/CnFormPage/CnFormPage.vue:594`) and re-copies it when the
  prop changes (the watcher at `:581`). Field visibility re-evaluates on every change
  through `evaluateVisibleWhenLocal` (`:500`).
- `CnFormDialog` builds `formData` from the item and the schema; nothing
  sets one field from another.
- Sentinel tokens are listed in `SENTINEL_VOCABULARY`
  (`src/utils/sentinelTokens.js:113`): filter tokens `@me`, `@now`,
  `@today` and relative dates, resolved by `resolveFilterTokens`
  (`src/utils/resolveFilterTokens.js`, `@me` at `:119`), and object tokens
  `@objectId`, `@object.<field>` when a record context is given.

## Decisions

### D1. `assign`: when, then set

```json
{ "key": "currency", "assign": [
  { "when": { "field": "country", "op": "eq", "value": "NL" }, "value": "EUR" },
  { "when": { "field": "country", "op": "eq", "value": "BE" }, "value": "EUR" }
] }
```

The first rule whose `when` holds sets the field, evaluated with the
same local predicate that drives visibility. `value` is a literal,
`@answer.<field>` or a sentinel token. Rules run when an answer they read
changes, not on every render, so a rule cannot loop on its own output.

A person's own typing wins: once the user edits a field by hand, its
`assign` rules stop until the form is reset. Overwriting what somebody
just typed because they changed another field is the failure mode users
remember.

### D2. Defaults are tokens

`default` on a field accepts a sentinel. The form resolves it once on
open through `resolveFilterTokens` with the user context, and with the
record context when the form opens from a record. `@me.displayName` and
`@me.email` join the filter vocabulary, resolved from the current user
the way `@me` is. A `default` never replaces a value `initialValue`
supplies.

### D3. `calculate` is the host's

```json
{ "key": "fee", "calculate": { "inputs": ["size", "type"] } }
```

`CnFormPage` takes a `calculate` prop, a function
`(fieldKey, answers) => Promise<value>`. When any of a field's `inputs`
changes, the page calls it after 400 ms of quiet, shows the field as
calculating, and writes the answer. The field renders read-only. A
rejected promise leaves the last value and shows "Could not calculate".
The library does not know what a rule set is; buildiq passes a function
that calls its rule engine in preview mode.

### D4. Unmet conditions sit beside submit

`CnFormPage` takes `unmetConditions: [{ message }]` and `blockSubmit`.
The list renders above the submit button in an `NcNoteCard`; with
`blockSubmit` and a non-empty list, submit is disabled and its tooltip
is the first message. The host decides what is unmet; the page only
shows it.

## Files

- `src/components/CnFormPage/CnFormPage.vue`: assign, default,
  calculate, unmet conditions.
- `src/components/CnFormDialog/CnFormDialog.vue`: assign and default.
- `src/utils/sentinelTokens.js`, `src/utils/resolveFilterTokens.js`:
  `@me.displayName`, `@me.email`, `@answer.<field>`.
- `src/schemas/app-manifest-v2.schema.json`: `formField.assign`,
  `formField.default` tokens, `formField.calculate`.

## Accessibility

A value set by `assign` or `calculate` is announced through the field's
own live description ("Filled in from Country"), so a screen reader user
learns why a field changed.
