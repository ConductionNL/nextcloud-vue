# valueArrayFor

Builds the array a dynamic-property declaration stores on its **parent** object.

A schema can declare `x-openregister-extends-form`, which lets records of a
definitions schema add fields to a form at runtime. A municipal case type
declares which extra questions its cases must answer; a product line declares
which attributes its orders carry. The schema cannot enumerate those, because a
functional admin adds them without a release.

Those answers can be stored two ways, and `valueArrayFor` builds the second.

| shape | where answers live | trade-off |
|---|---|---|
| child records (default) | one object per answer in a values schema | queryable per answer; needs a second write after the parent exists |
| array (`values.mode: "array"`) | an array property on the parent | one read, one write, atomic with the parent; not queryable per answer |

## Signature

```js
valueArrayFor(answers, config, definitions) // => Array<object>
```

- `answers` — `{ definitionId, value }` entries from the form.
- `config` — one `x-openregister-extends-form` declaration.
- `definitions` — the definition records, read for their names.

## Shape of an entry

```js
[
  { propertyDefinition: 'def-1', name: 'plafond', value: '50000' },
  { propertyDefinition: 'def-2', name: 'targetGroup', value: 'Sport' },
]
```

The key names come from `values.definitionRef`, `values.nameKey` and
`values.valueKey`, defaulting to `definition`, `name` and `value`.

Each entry carries the definition's **name** as well as its id. That
denormalisation is the point of the array shape: a reader renders the answers
without resolving every definition first.

## Behaviour worth knowing

- Empty answers (`''`, `null`, `undefined`) are dropped, exactly as the child-record shape drops them.
- A non-scalar answer is JSON-serialised rather than dropped.
- Given a record-mode config it returns `[]`, so the two shapes can never both fire and write the answers twice.
- A definition it cannot resolve still yields an entry, with an empty `name`.

## Example declaration

```json
"caseType": {
  "x-openregister-extends-form": {
    "definitions": { "schema": "propertyDefinition", "filter": { "caseType": "$value" } },
    "map": { "title": "name", "type": "propertyType", "required": "isRequired" },
    "values": { "mode": "array", "arrayKey": "properties",
                "definitionRef": "propertyDefinition", "valueKey": "value" }
  }
}
```

See also [`usesArrayValues`](uses-array-values.md) and [`valueRecordsFor`](value-records-for.md).
