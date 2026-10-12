# manifest-form-page-type Delta: form-page-shows-server-findings

## ADDED Requirements

### Requirement: A refused submit MUST mark its findings on their fields

When an endpoint submit is refused with a body carrying `findings[]`, each `{ field?, property, code, message }`, CnFormPage SHALL show each finding's message on the field whose key equals the finding's `field`, or else its `property`, SHALL list those fields in the error summary, and SHALL move to the step holding the first one. A finding on no field of the form SHALL stay in the general error. A refusal without `findings` SHALL mark no field.

#### Scenario: Two findings on two fields
- **GIVEN** a form with fields `title` and `startDate`
- **WHEN** the submit is answered 422 with findings on `title` and `startDate` and one on `caseType`
- **THEN** both fields show their message, the summary lists `title` and `startDate`, and `caseType` stays in the general error

### Requirement: A form MAY carry a honeypot field

With `honeypot` set to a field name, CnFormPage SHALL render that field out of sight, out of the tab order and hidden from assistive technology. When it is filled, submit SHALL send nothing and SHALL show the normal success. The honeypot value SHALL never be part of the payload.

#### Scenario: A bot fills the honeypot
- **GIVEN** a form with `honeypot: "_hp"`
- **WHEN** the `_hp` field is filled and the form is submitted
- **THEN** no request is sent and the form shows it was sent
