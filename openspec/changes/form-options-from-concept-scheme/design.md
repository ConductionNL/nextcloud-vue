# Design: form-options-from-concept-scheme

Read at nextcloud-vue development `3e606bf10` and openregister
development `555af72` (`lib/` and `appinfo/routes.php`).

## What is there

In OpenRegister:

- A property is bound to a scheme in one of two spellings:
  `x-openregister-concepts` (an object: `scheme`, `store`,
  `allowDeprecated`, `branch`, `leafOnly`, `maxDepth`,
  `contextProperty`, `contextKey`) and the simple `conceptScheme` (a
  string) (`lib/Service/Vocabulary/CodedPropertyDeclaration.php:49`,
  `:64`). One factory reads both into one declaration
  (`lib/Service/Vocabulary/CodedPropertyDeclarationFactory.php:49-76`,
  the simple spelling at `:106-137`). A property with a scheme beside a
  literal `enum`, or with both spellings, is refused on save
  (`lib/Service/Schemas/CodedChoiceDeclaration.php:82`).
- The options are served by `GET /index.php/apps/openregister/api/vocabulary/options`
  (`appinfo/routes.php:1088`), `VocabularyController::propertyOptions()`
  (`lib/Controller/VocabularyController.php:144-202`). It takes
  `schema` and `property` (or a bare `scheme`), an optional `context`,
  `language` and `tree`, and answers
  `{ property, scheme, language, context, results, total }`. It is a
  public page with an anonymous rate limit of 120 a minute (`:141-143`).
- `schema` is resolved by `SchemaMapper::find()`, which matches an id, a
  uuid or a slug (`lib/Db/SchemaMapper.php:409`), through
  `VocabularyDeclarationResolver::resolveDeclaration()`
  (`lib/Service/Vocabulary/VocabularyDeclarationResolver.php:76-100`).
- Each option is `{ value, uri, label, notation, weight, leaf, fields }`
  (`lib/Service/Vocabulary/CodedOptionsBuilder.php:170-178`). `value` is
  what to store: the concept uri, or its notation when `store` is
  `notation` (`:163-168`). A retired value is absent from the options
  and still resolves through `GET /api/vocabulary/concept?uri=` and
  `GET /api/vocabulary/concept/notation?scheme=&notation=`
  (`appinfo/routes.php:1078-1079`).

In nextcloud-vue:

- `src/` has no reference to `conceptScheme`, `x-openregister-concepts`
  or `/api/vocabulary/`.
- `resolveWidget(prop)` (`src/utils/schema.js:374`) maps `enum` to
  `select` (`:381-383`) and a user reference to `user` (`:400-410`);
  anything else without a type-specific widget falls back to text.
- `fieldsFromSchema` tags fields the form must resolve with a request:
  `reference` for an object reference and `userPicker` for a user
  (`src/utils/schema.js:678-694`). Pure: it fetches nothing.
- `CnFormDialog` already runs async selects. `isAsyncEnum(field)`
  (`src/components/CnFormDialog/CnFormDialog.vue:2324-2326`) routes a
  field to `asyncState` (`:952`), `getEffectiveOptions` (`:2942-2948`)
  reads its options, and `getEffectiveSelectedOption` shows a stored id
  by a label from the `referenceLabels` cache (`:964`). The select and
  multiselect branches render from those (`:217-258`, `:259`).

## Decisions

### D1. `fieldsFromSchema` tags a coded field and stays pure

A property with `conceptScheme` or `x-openregister-concepts`, or an
array whose `items` carry one, gets `codeList: { property, multiple,
store, contextProperty }` and widget `select` (or `multiselect` for an
array). `property` is the key. `store` and `contextProperty` come from
`x-openregister-concepts` when present. The function reads no network.

Rejected: reading the scheme's concepts through
`/api/vocabulary/concepts` and filtering them in the browser. The
validity window, the branch, the leaf rule and the context subset are
OpenRegister's rules; `/api/vocabulary/options` applies them, and a
second copy in the browser would drift.

### D2. `CnFormDialog` asks OpenRegister for the options

A coded field joins the async path through `isAsyncEnum`. When the
dialog opens it calls `/api/vocabulary/options` once per coded field
with `schema` (the dialog's schema id, else its slug), `property`, and
`language` from `@nextcloud/l10n`. Each result becomes an option
`{ id: value, label }` in OpenRegister's order. Choosing one stores
`value` as a plain string, or an array of strings for a multiselect,
never the option object.

When the call fails or returns no options, the field shows the text
input it had before with a helper line saying the list could not be
loaded, so the user is not blocked. OpenRegister still refuses a value
outside the scheme on save.

Rejected: one request for all coded fields. The endpoint answers one
property at a time, and a dialog rarely has more than two coded fields.

### D3. A value no longer offered still reads correctly

When a record holds a value that is not in the options, the dialog
resolves it once through `/api/vocabulary/concept?uri=` (or the notation
route when `store` is `notation`), shows its preferred label in the
user's language with a "no longer offered" note, and keeps it selected
until the user changes it. The label goes into the same cache the
reference fields use.

Rejected: showing the raw uri. That is the text box problem again.

### D4. A context-bound field follows its context

When `codeList.contextProperty` is set, the dialog sends that field's
current value as `context` and asks again whenever it changes. A chosen
value that is not in the new options is kept and marked as not offered
for the new context, rather than cleared behind the user's back.

## Files

- `src/utils/schema.js`: the coded field tag and widget.
- `src/components/CnFormDialog/CnFormDialog.vue`: the options request,
  the retired label, the context refetch.

## Security

The endpoint is read-only and public by OpenRegister's design;
vocabularies are reference data. The dialog sends only the schema id,
the property key, the language and a context value. Option labels are
rendered as text by `NcSelect`.

## Accessibility

The select uses `inputLabel`, as every `CnFormDialog` select does. The
"no longer offered" note and the load failure line are text in the
field's helper, not colour alone.
