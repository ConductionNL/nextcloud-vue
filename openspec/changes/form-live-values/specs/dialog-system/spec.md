# dialog-system Delta: form-live-values

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [form-live-values](../../)

## Purpose

A form fills in a field from another answer, from the signed-in user or
the record, or from a host calculation, and shows the host's unmet
conditions before submit. Row `form-conditional-values` (buildiq matrix)
and the renderer half of buildiq's `forms-live-values-and-checks`.

## ADDED Requirements

### Requirement: A field is filled in from another answer

`CnFormPage` and `CnFormDialog` SHALL accept `assign` rules on a field,
each a local condition and a value (a literal, `@answer.<field>` or a
sentinel token). When an answer a rule reads changes, the first rule
whose condition holds SHALL set the field. Once the user edits the field
by hand, its rules SHALL NOT overwrite it until the form is reset.

#### Scenario: The currency follows the country

- GIVEN a field `currency` with an assign rule setting "EUR" when `country` equals "NL"
- WHEN an applicant picks the Netherlands
- THEN Currency shows EUR
- AND the field says it was filled in from Country

#### Scenario: Typing wins

- GIVEN the applicant then typed "USD" into Currency
- WHEN she changes Country to Belgium
- THEN Currency still shows USD

### Requirement: A default is resolved from the user or the record

A field's `default` SHALL accept `@me`, `@me.displayName`, `@me.email`,
`@today`, `@now` and, when the form opens from a record,
`@object.<field>`, resolved once when the form opens. A value supplied by
`initialValue` SHALL win over a default.

#### Scenario: The applicant's e-mail is already there

- GIVEN a permit form whose `email` field has `default: "@me.email"`
- WHEN a signed-in resident opens it
- THEN E-mail shows her Nextcloud e-mail address

### Requirement: A field is calculated by the host

`CnFormPage` SHALL accept a `calculate` function and SHALL call it for a
field declaring `calculate.inputs` when one of those answers changes,
after a quiet period, writing the result into the read-only field. A
failed calculation SHALL keep the last value and say it could not be
calculated.

#### Scenario: The fee follows the size

- GIVEN a `fee` field calculated from `size` by the host's rule set
- WHEN the applicant changes the size from 50 to 120 square metres
- THEN Fee shows the new amount without a page reload

### Requirement: Unmet conditions are shown beside submit

`CnFormPage` SHALL render a host-provided `unmetConditions` list above
the submit button and, with `blockSubmit`, SHALL disable submit while the
list is not empty, using the first message as the reason.

#### Scenario: A loan form explains why it waits

- GIVEN the host reports "Het inkomen is te laag voor deze regeling" with `blockSubmit`
- WHEN the applicant looks at the form
- THEN the sentence shows above Submit and Submit is disabled with that sentence as its reason
