# dialog-system Delta: form-conditions-from-schema

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [form-conditions-from-schema](../../)

## Purpose

The library's forms follow conditions an administrator sets on the
schema: show, hide and require a field by another field's value, offer
only the options allowed for another field's value, and show a rule's
refusal under the field it concerns. Row `plat-field-conditions`
(pipelinq matrix), with the stackiq, shillinq and portaliq halves.

## ADDED Requirements

### Requirement: A property shows or hides itself by another field's value

`fieldsFromSchema` SHALL turn a property's `x-openregister-visible-when`
into a field condition. `CnFormDialog` and `CnFormPage` SHALL evaluate it
with the shared local predicate on every change, SHALL hide the field
while it fails, and SHALL leave a hidden field out of the payload. A
condition naming an `endpoint` or a `source` SHALL be ignored when it
comes from a schema. The existing field condition shapes of
`CnFormDialog` SHALL keep working.

#### Scenario: A complaint asks for its category

- GIVEN a Request schema whose `complaintCategory` carries `x-openregister-visible-when: { field: "requestType", op: "eq", value: "Klacht" }`
- WHEN a KCC employee opens New request and picks "Klacht" as the request type
- THEN the Complaint category field appears
- AND picking "Vraag" hides it again

#### Scenario: A hidden field is not sent

- GIVEN the employee filled in a category and then switched to "Vraag"
- WHEN she saves
- THEN the payload carries no `complaintCategory`

### Requirement: A property is required by another field's value

`fieldsFromSchema` SHALL turn `x-openregister-required-when` into a field
condition. While it holds, both forms SHALL mark the field required and
SHALL refuse to send the form with the field empty, naming the field.

#### Scenario: A complaint cannot be saved without a category

- GIVEN `complaintCategory` carries `x-openregister-required-when` on `requestType` equal to "Klacht"
- WHEN the employee picks "Klacht" and saves without a category
- THEN the form stays open and says Complaint category is required

### Requirement: A dependent property offers only the allowed values

For a property carrying `x-openregister-dependent-values`, both forms
SHALL offer only the values its `allowed` table lists for the
controlling field's current value, SHALL offer every value when the table
has no row for it, and SHALL clear a chosen value that falls outside the
list when the controlling field changes.

#### Scenario: Only open-source licences for open source

- GIVEN a module schema whose `licence` carries dependent values controlled by `licentietype`
- WHEN an editor sets the licence type to "Open source"
- THEN the licence select offers only the open-source licences
- AND switching to "Closed source" clears a licence chosen before

### Requirement: A host adds required fields at runtime

`CnFormDialog` and `CnFormPage` SHALL accept `requiredFields`, merge it
with the schema's `required` for marking and checking, and `CnIndexPage`
SHALL pass it from `config.requiredFields` or a host-provided map keyed
by schema.

#### Scenario: One administration requires a cost centre

- GIVEN shillinq passes `requiredFields: ["costCenterCode"]` for supplier invoices in Gemeente Voorbeeld
- WHEN a bookkeeper opens New supplier invoice
- THEN Cost centre is marked required and an empty one is refused before sending

### Requirement: A rule refusal lands under the fields it names

When OpenRegister refuses a save with rule entries that carry
`properties` and a `message`, the form SHALL show each message under
every named field and SHALL stay open. An entry naming no property SHALL
show as the form-level message.

#### Scenario: The server's reason under the field

- GIVEN an administered validation on supplier invoices naming `costCenterCode` with the message "Elke inkoopfactuur wordt op een kostenplaats verantwoord"
- WHEN a save without a cost centre reaches the server and is refused
- THEN that sentence appears under Cost centre

### Requirement: An administrator sets conditions without code

The property editor of `CnSchemaFormDialog` SHALL offer Show when and
Required when, each picking another property of the schema, an operator
and a value, and SHALL write the matching annotation on the property.
Clearing a condition SHALL remove its key.

#### Scenario: A functional administrator adds a rule

- GIVEN an administrator editing the Request schema in OpenRegister
- WHEN she sets Show when on Complaint category to Request type equals Klacht and saves
- THEN the property carries `x-openregister-visible-when`
- AND the next New request form follows it

### Requirement: The local predicate is exported from the package root

`evaluateVisibleWhenLocal` and `isLocallyDecidableVisibleWhen` SHALL be
exported from `@conduction/nextcloud-vue`'s root entry.

#### Scenario: An embed imports the predicate

- GIVEN a portal embed that imports `evaluateVisibleWhenLocal` from `@conduction/nextcloud-vue`
- WHEN it is built
- THEN the import resolves without a deep path
