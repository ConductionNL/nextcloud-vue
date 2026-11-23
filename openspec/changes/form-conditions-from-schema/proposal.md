---
kind: code
depends_on: []
---

# Proposal: form-conditions-from-schema

## Why

"Show this field only when the request type is Complaint", "the cost
centre is required for supplier invoices", "only open-source licences
when the licence type is Open source". An administrator should be able
to set rules like these on the schema and see every form follow them.

Today the library's forms follow them only when a developer writes them
into the app's manifest. `CnFormDialog` hides a field when its field
descriptor carries `condition` or `visibleWhen`, and `fieldsFromSchema`
derives neither from the schema: the only conditional it reads from a
property is `x-openregister-readonly-when`. OpenRegister, meanwhile,
already refuses saves by administrator rules (`x-openregister-validations`,
`x-openregister-dependent-values`), and the form shows those refusals as
one message at the top, not under the field that caused them.

## Row

| matrix | row | name | own rating | built |
|---|---|---|---|---|
| pipelinq | `plat-field-conditions` | Show, hide or validate a field depending on the value of another field, without code | no | none |

Built evidence: "the shared form ... hides a field on a condition only
when a field descriptor carries condition/visibleWhen, and
src/utils/schema.js does not derive one from a schema property (it maps
only x-openregister-readonly-when, :688). No pipelinq manifest page
declares a condition, and no admin screen lets one be set".

Demand: tender, https://www.tenderned.nl/aankondigingen/overzicht/414529,
with the requirements "veldvalidatie conditioneel, afhankelijk van de
waarde van een ander veld" (CIBG, 2026-03-04) and "afhankelijkheden van
velden onderling" (NZa CRM, 2024-12-06).

## Competitor evidence, quoted from the pipelinq matrix

- HubSpot CRM, yes: "Use conditional property logic to control when
  additional properties should display or require a value based on a
  user's previous input",
  https://knowledge.hubspot.com/properties/set-up-conditional-logic-for-enumeration-properties
- EspoCRM, yes: Dynamic Logic per field, "conditions making certain
  fields visible, required or read-only" and option sets per condition,
  https://docs.espocrm.com/administration/dynamic-logic/
- Pipedrive, Odoo CRM and KISS, partial: required per pipeline stage,
  conditions in view XML, or one hard-coded rule.

## Sibling halves this change also covers

- stackiq `landscape-dependent-field-options`, REQ-DFO-003 "The form
  offers only the allowed options": "`CnFormDialog` gains the same
  treatment for `x-openregister-dependent-values` that
  `relationFilterDecls` gives `x-relation-filter`" (design).
- shillinq `platform-required-fields`, REQ-PRF-002: "A host-provided map
  of extra required fields per schema lets the form mark and pre-check
  them; until it exists the server refusal names the missing fields in
  the form's error."
- portaliq `intake-conditional-questions-and-drafts`: "re-exports
  `evaluateVisibleWhenLocal` from its package root. Today it is exported
  from `src/utils/index.js` but not from `src/index.js`".

## What changes

- A property may carry `x-openregister-visible-when` and
  `x-openregister-required-when`, with the same condition shape the form
  page already evaluates (`{ field, op, value }`). `fieldsFromSchema`
  turns them into field conditions; `CnFormDialog` and `CnFormPage` show,
  hide and require fields by them as the user types.
- The schema editor the library ships (`CnSchemaPropertyActions`) gains
  Show when and Required when, so an administrator sets them without
  code.
- A property carrying `x-openregister-dependent-values` offers only the
  values allowed for the controlling field's current value, and clears a
  value that falls outside.
- A host may pass extra required fields per schema (`requiredFields`),
  which the form marks and checks before sending.
- A save OpenRegister refuses by a rule that names its properties shows
  the rule's message under those fields.
- `CnFormDialog` evaluates conditions with the same module `CnFormPage`
  uses, and `evaluateVisibleWhenLocal` is exported from the package root.

## Affected projects

- `nextcloud-vue`: `src/utils/schema.js`, `CnFormDialog`, `CnFormPage`,
  `src/utils/visibleWhen.js`, `src/utils/fieldCondition.js`,
  `src/utils/errors.js`, `CnSchemaPropertyActions`, `src/index.js`.
- `openregister`: server-side enforcement of `x-openregister-required-when`
  (see cross-project dependencies).
- Consumers: pipelinq, stackiq, shillinq, portaliq, and every app that
  edits objects through the library's forms.

## Backward compatibility

A schema without the new annotations renders exactly as before. The
existing `condition` shapes on `CnFormDialog` fields (`equals`, `in`,
`truthy` and the rest) keep working: they are translated to the shared
predicate, not removed. `requiredFields` defaults to none.

## Cross-project dependencies

- OpenRegister keeps property-level `x-openregister-*` keys as data (the
  library's `x-openregister-readonly-when` works that way today and
  OpenRegister does not read it). Visibility needs nothing more.
- Required-when must also be enforced on save, or a client that skips
  the form skips the rule. That is an OpenRegister listener in the shape
  of `DependentValueListener`. Listed for the openregister lane. Until it
  exists, the administrator can express the same rule as an
  `x-openregister-validations` entry, which OpenRegister enforces today.
