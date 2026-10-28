# setup-wizard Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [setup-wizard-optional-skip](../../)

## ADDED Requirements

### Requirement: A setup step can be skipped

A setup step with `skippable: true` SHALL offer "Skip this step" in the wizard footer, except on the last step. Skipping SHALL move to the next step without validating the step and without saving any of it.

#### Scenario: PqInstellen Organisatie

- **GIVEN** the organisation step with `skippable: true`
- **WHEN** the admin clicks "Deze stap overslaan"
- **THEN** the wizard shows step 5 and no organisation field was written

### Requirement: A setup step can mark its fields optional

A config-fields step with `optionalLabels: true` SHALL put "(optional)" after the label of every field its schema does not require, and SHALL show its `note` under the fields.

#### Scenario: PqInstellen Organisatie

- **THEN** "Naam organisatie (optioneel)" … "Website (optioneel)", and under them "Per veld opgeslagen als je verdergaat …"
