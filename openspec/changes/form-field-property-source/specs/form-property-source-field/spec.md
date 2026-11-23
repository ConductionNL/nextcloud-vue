# form-property-source-field Specification

## Purpose

A form field backed by an authoritative registry: the user looks a value up
instead of typing it, and the form can fill the related fields from the
answer. The declaration is OpenRegister's `x-openregister-property-source`;
the lookup is integriq's `registry-field-source`.

## ADDED Requirements

### Requirement: A declared property renders as a registry type-ahead

`fieldsFromSchema` SHALL copy a property's `x-openregister-property-source`
onto the field descriptor as `propertySource` with `provider`, `mode`
(default `live`) and `config` (default `{}`), and SHALL resolve the widget to
`property-source` unless a `fieldOverrides` entry names another widget.
`CnFormDialog` SHALL render that widget with `CnPropertySourceField`. From
three typed characters, debounced, the field SHALL call
`GET /apps/integriq/api/property-sources/{provider}/suggest?q=` and SHALL
list the results' `label`. On a pick it SHALL call
`.../resolve?identifier=<identifier>` and SHALL set the field's value to the
identifier only after the resolve answers.

#### Scenario: Looking up a company

- **GIVEN** a Payee form whose `kvkNumber` declares provider `kvk`, mode `default`
- **WHEN** the user types "Eneco" and picks "Eneco Energie B.V." with identifier 24502797
- **THEN** a resolve for identifier 24502797 SHALL be sent
- **AND** the field's value SHALL be "24502797"

#### Scenario: Fewer than three characters

- **GIVEN** the same field
- **WHEN** the user types "En"
- **THEN** no suggest request SHALL be sent

#### Scenario: Provenance is shown

- **GIVEN** a resolve answering `provenance: {provider: "kvk", readAt: "2026-10-07T10:00:00+02:00", origin: "cache", cacheAgeSeconds: 600}`
- **WHEN** the value is set
- **THEN** a line under the field SHALL name the provider and the read time and say the answer came from cache

#### Scenario: An override wins

- **GIVEN** a declared property and `fieldOverrides.kvkNumber.widget: "text"`
- **WHEN** the form renders
- **THEN** the field SHALL be a plain text input and no suggest request SHALL be sent

@e2e include With integriq's kvk source linked, open a form with a KvK-backed field; type a company name; pick a suggestion; assert the resolve call and the stored identifier.

### Requirement: A pick fills empty sibling fields and asks before replacing

When `propertySource.mode` is `default` and `config.fill` is an object of
`{targetKey: sourcePath}`, the form SHALL, after a successful resolve, read
each `sourcePath` (dot and `[n]` segments, or a literal when it starts with
`=`) from the resolved `value` and SHALL write it to `targetKey` (dotted
keys reach a field of an object property) when that target is empty
(`undefined`, `null`, `''` or `[]`). Targets that already hold a different
value SHALL be listed together in one confirmation; on decline they SHALL
keep their values while the empty targets are still filled. A path that
resolves to nothing SHALL leave its target alone. The fill SHALL run once
per pick and SHALL NOT run again on a later open of the record. In mode
`live` no sibling SHALL be filled.

#### Scenario: Adding a supplier fills the details

- **GIVEN** an empty Payee form whose `kvkNumber` fill maps `name` from `naam`, `tradingName` from `handelsnamen[0].naam`, `address.city` from `_embedded.hoofdvestiging.adressen[0].plaats` and `address.country` from `=NL`
- **WHEN** the user picks Eneco Energie B.V. and the resolve answers
- **THEN** Name SHALL read "Eneco Energie B.V.", the trading name and city SHALL be filled from the answer, and the country SHALL read "NL"

#### Scenario: A typed name is not overwritten without asking

- **GIVEN** the user typed "Eneco" in Name before picking
- **WHEN** the resolve answers with naam "Eneco Energie B.V."
- **THEN** the form SHALL ask whether to replace "Eneco" with "Eneco Energie B.V."
- **AND** on decline Name SHALL still read "Eneco" while the empty fields are filled

#### Scenario: A saved record is not re-synced

- **GIVEN** a customer saved from a KvK pick in mode `default`
- **WHEN** the user opens its edit form later
- **THEN** no resolve SHALL be sent and no field SHALL change

#### Scenario: Live mode fills nothing

- **GIVEN** a property with mode `live` and a `config.fill` map
- **WHEN** the user picks a suggestion
- **THEN** only the field's own value SHALL change

@e2e include Type a name into Name; pick a company in the KvK field; assert the replace prompt lists Name; decline; assert Name kept and the address filled.

### Requirement: Without a working lookup the field is a plain text field that saves

The field SHALL render as a plain text input with a one-line reason, and the
form SHALL save the typed value, when integriq is not installed for the user,
when suggest answers 404 (unknown provider), 401 or 403, or when resolve
answers 409 (source not configured) or reports `provenance.unreachable` with
no value. A failed resolve after a pick SHALL keep the picked identifier and
SHALL NOT run the fill. None of these cases SHALL block saving.

#### Scenario: The KvK source is not set up

- **GIVEN** integriq is installed and the resolve answers 409
- **WHEN** the user types 12345678 and saves
- **THEN** the field SHALL say the lookup is not set up and the record SHALL save with 12345678

#### Scenario: Integriq is not installed

- **GIVEN** an instance without integriq
- **WHEN** the form renders a declared property
- **THEN** no request to `/apps/integriq/` SHALL be made and the field SHALL be a plain text input with a reason

#### Scenario: The source is down

- **GIVEN** a resolve answering `value: null` with `provenance.unreachable: true`
- **WHEN** the user picks a suggestion
- **THEN** the picked identifier SHALL stay in the field, no sibling SHALL change, and the field SHALL say the source did not answer
