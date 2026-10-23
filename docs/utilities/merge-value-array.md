# mergeValueArray

Builds the array an array-mode `x-openregister-extends-form` declaration
stores after a form answered it, merging the form's answers over what the
record stored.

## Signature

```js
mergeValueArray(existing, answers, config, definitions) // => Array<object>
```

- `existing` — the stored array (absent on a new record).
- `answers` — `{ definitionId, value }` entries from the form.
- `config` — one `x-openregister-extends-form` declaration.
- `definitions` — the definition records, read for their names (optional).

## Behaviour worth knowing

- A changed answer replaces its entry in place; an unchanged one keeps its stored entry as it was.
- A cleared answer loses its entry; a new one is added at the end.
- An entry for a definition the form did not ask stays. A form only asks the questions its case type asks today, so replacing the whole array would erase every answer it was not shown.
- Given a record-mode declaration it returns the stored array unchanged.

See also [`storedAnswersFor`](stored-answers-for.md) and [`valueArrayFor`](value-array-for.md).
