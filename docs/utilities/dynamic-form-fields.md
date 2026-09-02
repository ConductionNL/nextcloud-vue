# Fields the data decides

Some domains keep half of an object's shape in the database instead of the schema. A municipal case type declares which extra questions its cases must answer. A product line declares which attributes its orders carry. The schema cannot enumerate those, because a functional admin adds them at runtime without waiting for a release.

`x-openregister-extends-form` is how a schema says so. Declare it on the property the user picks first, and [`CnFormDialog`](../components/cn-form-dialog.md) fetches that value's field definitions and renders them underneath the schema's own fields.

## The three parts

| Part | What it is | Example in dossiq |
|---|---|---|
| Driving property | The reference the user picks first. Carries the declaration. | `case.caseType` |
| Definitions schema | Records describing the extra fields, filtered by the driving value. | `propertyDefinition` |
| Values schema | One answer per definition per object, written after the object exists. | `caseProperty` |

## Declaring it

```json
"caseType": {
  "type": "string",
  "$ref": "caseType",
  "title": "Case type",
  "order": 1,
  "x-openregister-extends-form": {
    "definitions": {
      "schema": "propertyDefinition",
      "filter": { "caseType": "$value" }
    },
    "map": {
      "title": "name",
      "description": "description",
      "type": "propertyType",
      "enum": "enumValues",
      "required": "isRequired",
      "default": "defaultValue"
    },
    "values": {
      "schema": "caseProperty",
      "objectRef": "case",
      "definitionRef": "propertyDefinition",
      "valueKey": "value"
    }
  }
}
```

### `definitions`

| Key | Description |
|---|---|
| `schema` | Slug of the schema whose records describe the fields. Required. |
| `register` | Register the definitions live in. Defaults to the form's own register. Use it for a cross-app definitions schema (ADR-066). |
| `filter` | Query filter narrowing the definitions to the chosen value. `$value` is the driving property's value; `@object.<field>` and the other [filter tokens](resolve-filter-tokens.md) resolve against the live form data. A token that stays unresolved is dropped rather than sent, because filtering on a literal `@object.foo` returns zero rows and reads exactly like a case type with no extra fields. |

### `map`

Which field on a definition record supplies each part of the resulting form field. Every key is optional and falls back to the dossiq names shown above, so a schema that follows that convention can omit `map` entirely.

Recognised roles: `title`, `description`, `definition`, `type`, `format`, `maxLength`, `enum`, `required`, `default`.

### `values`

| Key | Description |
|---|---|
| `schema` | Slug of the schema holding the answers. Required for the answers to be persisted. |
| `register` | Register the value rows live in. Defaults to the object's own. |
| `objectRef` | Field on the value row pointing at the parent object. Default `object`. |
| `definitionRef` | Field pointing at the definition. Default `definition`. |
| `valueKey` | Field holding the answer. Default `value`. |

## Declared types

A definition record's declared type becomes a JSON Schema type and format, so widget resolution is the ordinary one:

| Declared | Renders as |
|---|---|
| `string`, `text` | text field |
| `textarea`, `markdown` | text area |
| `number`, `integer` | number field |
| `boolean` | switch |
| `date` | date picker |
| `datetime` | date and time picker |
| `email` | email field |
| `url`, `uri` | URL field |
| `enum` | dropdown over the record's enum values |
| `json`, `object` | JSON editor |
| `array` | tag input |

Add your own with a `typeMap` on the declaration. A type nothing maps falls back to a text field rather than disappearing.

## What the dialog does

1. Nothing, until a driving value is picked. No declaration means no fetch and no watcher work, which is every schema that declares none.
2. On a pick, it fetches the matching definitions and turns each into a JSON Schema property, then runs them through [`fieldsFromSchema`](fields-from-schema.md). A dynamic field is not a second kind of field: widgets, enum labels, validation and required-marking all come from the one engine.
3. Each field is keyed `x-prop:<definition id>`, never the admin-authored name. A definition called `title` or `status` is not merely possible, it is likely, and an unprefixed key would silently overwrite the real field. Keying by id also means a definition can be renamed without orphaning the answers stored against it.
4. Changing the driving value clears the previous answers, so no value carries across case types.
5. A definition's default seeds its field, without overwriting an answer already given.

## Persisting the answers

A value row references the parent, so it cannot be written in the same call. `confirm` therefore carries two arguments:

```js
async onConfirm(formData, dynamic) {
  const saved = await store.saveObject('dossiq/case', formData)
  if (!dynamic) return
  for (const row of valueRecordsFor(dynamic.answers, dynamic.declarations[0].config, saved.id)) {
    await store.saveObject('dossiq/caseProperty', row)
  }
}
```

`formData` holds only the object's own fields. A host that ignores the second argument still posts a clean payload rather than sending dynamic keys to a schema that does not declare them, which OpenRegister would drop with a 200 and no error.

A manifest `open-form` action gets all of this for free: [`CnActionButtons`](../components/cn-action-buttons.md) saves the object and then the value rows.

## Related

- [`splitDynamicFormData`](split-dynamic-form-data.md) separates a payload into the object's fields and its answers.
- [`valueRecordsFor`](value-records-for.md) builds the value rows for a saved object.
- [`EXTENDS_FORM_KEY`](extends-form-key.md) and [`DYNAMIC_KEY_PREFIX`](dynamic-key-prefix.md) are the vocabulary constants.
