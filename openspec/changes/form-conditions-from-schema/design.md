# Design: form-conditions-from-schema

Read at nextcloud-vue development `c8aa85863` and openregister development
`555af72`.

## What is there

- `fieldsFromSchema` in `src/utils/schema.js` maps one conditional from a
  property, `readOnlyWhen` from `x-openregister-readonly-when` (`:700`).
  Nothing else conditional is derived from the schema.
- `CnFormDialog.fieldVisible(field)` (`src/components/CnFormDialog/CnFormDialog.vue:1908`)
  evaluates `field.condition || field.visibleWhen` with its own shapes
  (`equals`, `notEquals`, `in`, `notIn`, `truthy`, `falsy`), the grammar of
  `src/utils/fieldCondition.js`.
- `CnFormPage` evaluates `field.visibleWhen` with a different grammar,
  `{ field, op, value }` with `eq | neq | gt | gte | lt | lte | empty |
  notEmpty`, through `evaluateVisibleWhenLocal`
  (`src/utils/visibleWhen.js:230`; used at `CnFormPage.vue:500`). A hidden
  field is left out of the payload.
- `relationFilterDecls` (`CnFormDialog.vue:1193`) narrows relation pickers
  by `x-relation-filter` against another field and clears stale values
  (`:1409-1413`). It is the pattern for option lists that follow a field.
- A 400 or 422 is parsed by `parseResponseError` (`src/utils/errors.js`),
  which keeps `body.validationErrors || body.errors` as `fields`; the
  index page hands them to `setValidationErrors(fieldErrors, message)`
  (`CnFormDialog.vue:3304`) through `setFormValidationErrors`
  (`CnIndexPage.vue:6300`). Errors keyed by field land under the field;
  anything else is one message above the form.
- OpenRegister: `x-openregister-dependent-values`
  (`lib/Service/Rules/DependentValueTable.php:56`, `{ controlledBy, allowed }`),
  enforced on save by `DependentValueListener`; `x-openregister-validations`
  (`lib/Service/Rules/AdministeredValidations.php:64`), each entry with a
  `condition`, a `severity`, a `message` and the `properties` it concerns.
- `CnSchemaPropertyActions` (`src/components/CnSchemaFormDialog/CnSchemaPropertyActions.vue`)
  is the property editor of the schema dialog OpenRegister and buildiq use:
  Required, Immutable, Hide in form view and the rest, no condition.

## Decisions

### D1. One predicate for both forms

`CnFormDialog` switches to `evaluateVisibleWhenLocal`. The old shapes are
translated on read (`equals` to `op: eq`, `in` to a list of `eq`, `truthy`
to `notEmpty`, and so on) by a pure adapter in `fieldCondition.js`, so no
manifest breaks. Two grammars for one question is how a condition that
works on a form page silently does nothing in a dialog.

### D2. Two property annotations, one shape

```json
"complaintCategory": {
  "type": "string",
  "x-openregister-visible-when": { "field": "requestType", "op": "eq", "value": "Klacht" },
  "x-openregister-required-when": { "field": "requestType", "op": "eq", "value": "Klacht" }
}
```

`fieldsFromSchema` emits `visibleWhen` and `requiredWhen` on the field.
Both forms evaluate them on every change. A field hidden by its
condition is left out of the payload (the existing CnFormPage rule, now
in the dialog too). A required-when field is marked required and checked
before sending while its condition holds. Only the local mode is read
from a schema: a schema annotation that names an `endpoint` or `source`
is ignored with a console warning, because a schema is data and must not
make the form call arbitrary URLs.

Rejected: JSON Schema `if`/`then`/`dependentRequired`. OpenRegister
validates with them, but they cannot express "hide", and a form that
reverse-engineers visibility from validation branches guesses wrong the
first time a branch does two things.

### D3. Dependent values narrow the options

For a property with `x-openregister-dependent-values`, the form looks up
the controlling field's current value in `allowed` and offers only that
list (or everything, when the table has no row for the value, which is
OpenRegister's own rule). A value that falls outside the new list is
cleared, as `relationFilterDecls` clears a stale relation. The table is
data the server enforces anyway; mirroring it in the form only saves the
user a refused save.

### D4. A host can add required fields

`CnFormDialog` and `CnFormPage` take `requiredFields: string[]`, merged
with the schema's `required` for marking and checking. `CnIndexPage`
passes `config.requiredFields` or a host-provided map keyed by schema.
Shillinq supplies it from its `FieldRequirement` records; its listener
stays the enforcement.

### D5. A refusal lands under the fields it names

`parseResponseError` also reads OpenRegister's rule refusals: an entry
carrying `properties` and `message` becomes a field error on each named
property. A refusal naming no property stays the form-level message.
Shillinq's REQ-PRF-002 scenario ("the form shows that cost centre is
required, with the reason") is this path.

### D6. The administrator sets conditions in the schema editor

`CnSchemaPropertyActions` gains Show when and Required when: pick
another property of the schema, an operator, a value. It writes the D2
annotations. Clearing the condition removes the key. This is the
"without code" half of the row: the same dialog OpenRegister's schema
page and buildiq's schema designer already mount.

### D7. `evaluateVisibleWhenLocal` from the package root

`src/index.js` exports it, with `isLocallyDecidableVisibleWhen`, so
portaliq's embed does not import a deep path.

## Files

- `src/utils/schema.js`, `src/utils/fieldCondition.js`,
  `src/utils/visibleWhen.js`, `src/utils/errors.js`, `src/index.js`.
- `src/components/CnFormDialog/CnFormDialog.vue`,
  `src/components/CnFormPage/CnFormPage.vue`.
- `src/components/CnSchemaFormDialog/CnSchemaPropertyActions.vue`.

## Risks

- [A client that bypasses the form] -> required-when is enforced only
  once OpenRegister's listener exists; until then an administrator who
  needs enforcement uses `x-openregister-validations`. The design says
  so in the docs, not only here.
- [A condition naming a field that does not exist] -> the field stays
  visible and a console warning names both, the fail-open rule
  `fieldCondition.js` already applies to a malformed condition.
