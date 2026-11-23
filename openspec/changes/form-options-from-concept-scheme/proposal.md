---
kind: code
depends_on: []
---

# Proposal: form-options-from-concept-scheme

## Why

A maker wants the choice list for "Categorie" kept in one place, so
every schema that uses it follows when the list changes. OpenRegister
can do that: a schema property names a concept scheme, OpenRegister
checks each value against it, and it serves the options a form should
offer. Buildiq's schema designer is about to write that binding. But the
forms in this library do not read it. A property bound to a scheme has
no `enum`, so `CnFormDialog` renders it as a free text box, and the user
has to type a concept URI by hand.

## Rows

The requesting change is buildiq `data-field-types-and-choice-lists`.
Its design, section "Risks", names this half:

> A choice bound to a concept scheme renders as a select only once
> nextcloud-vue reads the options OpenRegister serves; until then the
> app shows a text input and OpenRegister still refuses a value outside
> the scheme.

Its proposal, section "Sibling halves": "nextcloud-vue: 2.57.1 has no
reference to `conceptScheme` or `x-openregister-concepts` in `src/` [...]
A choice bound to a scheme renders as a select only once the form reads
the options OpenRegister serves [...] Both are nextcloud-vue's." Its
design D1 stores a choice as `string` with `conceptScheme` and a several
choices field as an `array` of the same; D2 writes `conceptScheme` and
removes `enum`.

Rows the requesting change covers:

| matrix | row | name |
|---|---|---|
| buildiq | `data-field-types` | Choose from typed fields such as text, number, date, choice, file and yes or no. |
| buildiq | `data-choice-lists` | Maintain the choice lists a field offers in one place. |
| buildiq | `data-user-field` | Assign records to platform users with a user field. |

This change covers the scheme-bound choice, the library half of
`data-choice-lists` and of the choice type in `data-field-types`. The
user field already renders (`src/utils/schema.js:400-410`). The file
field is the open change `form-file-and-camera-fields`, which already
names this buildiq change as a half it covers.

Read for this change, in OpenRegister development `555af72`: a property
is bound by `conceptScheme` (a string) or by `x-openregister-concepts`
(an object with `scheme` and options such as `store` and
`contextProperty`), both read by one factory
(`lib/Service/Vocabulary/CodedPropertyDeclarationFactory.php:49-137`).
The options are served by `GET /api/vocabulary/options`
(`appinfo/routes.php:1088`, `lib/Controller/VocabularyController.php:144-202`),
not inlined on the schema read as the buildiq proposal's "options on
schema read" suggests.

## What changes

- `fieldsFromSchema` recognises a property bound to a concept scheme,
  alone or as the items of an array, and marks it as a coded field with
  what the form needs to ask for its options.
- `CnFormDialog` renders a coded field as a select, or a multiselect for
  an array, with the options OpenRegister serves for that schema and
  property, in the user's language.
- A value that is no longer offered still shows by its label on a record
  that holds it, marked as no longer offered.
- A field whose options depend on another field's value asks again when
  that value changes.

## Affected projects

- `nextcloud-vue`: `src/utils/schema.js`, `CnFormDialog`.
- Consumers: buildiq built apps, dossiq (case type categories), and any
  app whose schema binds a property to a concept scheme.

## Backward compatibility

A property without a scheme binding renders as before. A bound property
that rendered as a text box now renders as a select; the stored value
(the concept URI, or its notation when the binding says so) does not
change.

## Out of scope

- Labels for coded values in tables, cards and filter facets.
- Tree pickers for a hierarchical scheme. The form offers the flat list
  OpenRegister returns.
- A context from a declared `contextKey`. Only a context from another
  property's value is handled.
- `CnFormPage` fields, which declare their own `enum` in the manifest.

## Cross-project dependencies

- OpenRegister: nothing new is needed for the options. To confirm there:
  its published `conceptScheme` modifier says the value is the scheme
  "by slug" (`lib/Service/Schemas/PropertyValidatorHandler.php:523-527`),
  while the options path looks the scheme up by its `uri` only
  (`lib/Service/Vocabulary/ConceptRepository.php:211-216`). A binding by
  slug returns no options unless the slug is also the scheme's uri.
- buildiq writes the binding (its D2) with the value OpenRegister
  resolves.
