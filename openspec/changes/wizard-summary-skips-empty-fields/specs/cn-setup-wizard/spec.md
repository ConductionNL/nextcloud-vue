# Setup wizard: the summary lists only filled fields

## ADDED Requirements

### Requirement: The summary lists only filled fields

The summary row of a `config-fields` step MUST list only the fields that hold a non-empty value, as `label: value`, and MUST read "Not set" when none do.

#### Scenario: Some fields filled

- GIVEN an organisation step with name filled and KvK and VAT empty
- WHEN the summary renders
- THEN its row reads only the name

#### Scenario: Nothing filled

- GIVEN an organisation step with every field empty or blank
- WHEN the summary renders
- THEN its row reads "Not set"
