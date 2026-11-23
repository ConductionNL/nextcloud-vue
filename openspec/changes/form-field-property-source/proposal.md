---
kind: code
---

# Proposal: form-field-property-source

## Summary

A form field whose schema property declares `x-openregister-property-source`
becomes a type-ahead over the named registry: the user types a few
characters, picks a company or an address from integriq's suggestions, and
the form stores the identifier. When the declaration carries a fill map, the
pick also fills the empty sibling fields (legal name, address) and asks
before replacing anything the user typed. Without integriq, or with the source
not set up, the field stays a plain text field that saves, and says why.

## Why

Three apps specified the declaration and the backend and are waiting for the
form:

- buildiq row `int-dutch-registries`: `data-registry-backed-field-option`
  (buildiq development) lets a maker declare the source and says: "A form field
  that reads `x-openregister-property-source`, calls integriq's suggest and
  resolve, and stores the identifier with its provenance belongs in
  nextcloud-vue. Until it lands, a declared field renders as a plain text field
  in a built app."
- integriq `registry-field-source` (archived `2026-09-29-registry-backed-field-source`)
  ships the `bag`, `brp` and `kvk` providers and the endpoints
  `GET /api/property-sources`, `/{provider}/suggest?q=` and
  `/{provider}/resolve?identifier=&fresh=`. Its REQ-RFS-002 says a suggestion
  is not an answer: the value is resolved by its identifier before it is
  stored.
- shillinq row `plt-kvk`: `contacts-kvk-lookup` (shillinq development, #1924)
  declares the KvK lookup on `CustomerMaster.kvkNumber` and `Payee.kvkNumber`
  with mode `default` and a fill map in `config.fill`, and asks the renderer
  for the fill rules in its REQ-KVKL-002 and REQ-KVKL-003.

OpenRegister accepts and checks the declaration
(`lib/Service/Schemas/PropertySourceDeclaration.php`: `provider`, `mode`
`live` (default) or `default`, `config` an object) and keeps it on the
property (`PropertyValidatorHandler.php:515`).

## What changes

- `fieldsFromSchema` carries the declaration onto the field descriptor as
  `propertySource: {provider, mode, config}` and picks widget
  `property-source` for it.
- New `CnPropertySourceField`, used by `CnFormDialog` for that widget:
  debounced suggest (from 3 characters), an `NcSelect` of suggestion labels,
  and on a pick a resolve by identifier; the identifier is the field's value.
- A provenance line under the field: provider label, read time, and "from
  cache" or "source unreachable" when the resolve says so.
- `config.fill` (`{targetKey: sourcePath}`): after the resolve, each target
  field that is empty is filled from the resolved value at `sourcePath`
  (dot and `[n]` paths). A filled target is listed in one confirm prompt
  before it is replaced. Mode `default` fills once per pick; nothing re-syncs
  later. Mode `live` does not fill siblings.
- Degraded paths: integriq absent, provider unknown (404), source not set up
  (409), or unreachable: the field is a plain text input with a one-line
  reason, and the form saves.

## Rows unblocked

- buildiq `int-dutch-registries` (the runtime half).
- shillinq `plt-kvk` (REQ-KVKL-002 and REQ-KVKL-003 renderer behaviour).
- integriq `registry-field-source` gets its first consumer in a form.

## Affected projects

- `nextcloud-vue`: `src/utils/schema.js`, `CnFormDialog`, new
  `CnPropertySourceField`.
- Consumers: shillinq, buildiq-built apps, dossiq and pipelinq forms with BAG
  or BRP fields once they declare them. Declaration only, no app code.

## Backward compatibility

Additive. A property without the key renders as today. The existing
`x-fill-from` template fill on reference fields keeps its behaviour
(overwrite); the new fill is a separate key with the gentler rule.

## Theming

`NcSelect`, `NcNoteCard`, `NcDialog`; Nextcloud CSS variables only.
