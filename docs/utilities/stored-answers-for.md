# storedAnswersFor

Reads the answers a record already stores for an array-mode
`x-openregister-extends-form` declaration, keyed the way the form keys its
data-driven fields. An edit form uses it to show what the record holds.

## Signature

```js
storedAnswersFor(record, config, properties) // => object
```

- `record` — the record being edited, or `null`.
- `config` — one `x-openregister-extends-form` declaration.
- `properties` — the dynamic properties, from `propertiesFromDefinitions`.

## Behaviour worth knowing

- Only questions in `properties` are read: an entry for a definition the form does not ask has no field to fill.
- An empty stored answer is no answer, so the field keeps its default.
- A record-mode declaration, or a record without the array, gives `{}`.

See also [`mergeValueArray`](merge-value-array.md) and [`valueArrayFor`](value-array-for.md).
