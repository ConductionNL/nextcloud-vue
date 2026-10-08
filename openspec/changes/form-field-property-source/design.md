# Design: form-field-property-source

Read on nextcloud-vue development `3eefb4f00`, integriq development
(`lib/Controller/PropertySourceController.php`,
`lib/PropertySource/ResolvedValue.php`), openregister development
(`PropertySourceDeclaration.php`), buildiq development
(`data-registry-backed-field-option`) and shillinq development
(`contacts-kvk-lookup`, merged in #1924) on 7 October 2026. No canvas board
draws this field; it sits where the schema-driven form already puts the
property.

## The contract

```
GET /apps/integriq/api/property-sources                       -> {results: [{id, label, identifier, ...}]}
GET /apps/integriq/api/property-sources/{provider}/suggest?q= -> {results: [{identifier, label, ...}]}  | 404 unknown provider
GET /apps/integriq/api/property-sources/{provider}/resolve?identifier=&fresh=
    -> {value, provenance: {origin, provider, sourceIdentifier, readAt, cacheAgeSeconds, unreachable, live}}
     | 400 no identifier | 404 unknown provider | 409 source not configured | 401/403
```

## D1. Suggest, then resolve

integriq REQ-RFS-002: a suggestion is not an answer. On a pick the field
calls `resolve` with the suggestion's `identifier` and only then sets the
value and runs the fill. If the resolve fails, the identifier is kept (the
user picked it) and the fill does not run; the reason shows under the field.

## D2. What is stored

The field stores the identifier as the property value, the same type the
property already has (`kvkNumber` stays a string). Provenance is shown, not
written: no schema in the fleet has a place for it yet, and writing an object
into a string property would be refused. A later change can add an optional
`config.provenanceField` once a schema asks for it.

## D3. The fill map

The key is `config.fill`, as shillinq proposed and asked the renderer to
confirm; this change settles on it. Shape `{targetKey: sourcePath}`, the
same direction as the existing `x-fill-from` (`{formKey: sourceKey}`), so a
reader knows both. `targetKey` may be dotted (`address.street`) to reach a
field of an object property. `sourcePath` supports dots and `[n]` indexes
(`handelsnamen[0].naam`, `_embedded.hoofdvestiging.adressen[0].straatnaam`).
A path that resolves to `undefined` or `null` leaves the target alone. A
target that is not a field of the form is ignored with one debug log.

Empty means `undefined`, `null`, `''` or an empty array. Non-empty targets
whose new value differs are collected and shown in one `NcDialog`: "Replace
these values with the ones from <provider label>?" listing field label, old
and new value. Declining keeps every old value and still fills the empty ones.

Constant values (shillinq's `address.country` fixed `NL`) are not paths. A
source path starting with `=` is a literal (`"=NL"`). This is the smallest
addition that covers the one constant in the fleet.

## D4. Modes

`default`: the fill runs once per pick; editing a filled field afterwards is
the user's business, and nothing re-reads the source on later opens
(shillinq D1: an invoice keeps the March name). `live`: no fill, because a
live source is read where it is shown, and copying it into siblings would
create exactly the stale copy live mode exists to avoid. On edit of an
existing record in `live` mode the field resolves the stored identifier once
to show its label and provenance.

## D5. Degrading

`isAppInstalled('integriq')` false: plain text input, reason "Registry
lookup is not available on this server." 404 on suggest: plain text, reason
names the provider. 409 on resolve, or `provenance.unreachable` with no
value: the identifier is kept, reason "The source did not answer; type the
value." The form never blocks save on the lookup (shillinq REQ-KVKL-003).

## D6. Permission errors

401 or 403 on suggest means the user may not query that registry (integriq
`requireQueryPermission`). The field becomes plain text with "You cannot
look this up." It is not an error toast.

## Files

- `src/utils/schema.js` (`propertySource` on the descriptor, widget choice)
- `src/utils/propertySourceFill.js` (path reading and the empty test)
- `src/components/CnPropertySourceField/CnPropertySourceField.vue`, `index.js`, `.md`
- `src/components/CnFormDialog/CnFormDialog.vue` (widget branch, fill and confirm)
- `tests/utils/propertySourceFill.spec.js`, `tests/components/CnPropertySourceField.spec.js`, `tests/components/CnFormDialogPropertySource.spec.js`
