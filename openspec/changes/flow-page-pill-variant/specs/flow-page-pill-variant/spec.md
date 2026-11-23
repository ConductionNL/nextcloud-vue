# flow-page-pill-variant Delta

## ADDED Requirements

### Requirement: A flow page names its pill's tone

The flow board SHALL draw the page's pill in the variant `config.pillVariant` names, and neutral when it names none.
A lifecycle pill (Draft, Retired) SHALL stay neutral.

#### Scenario: dossiq's case type flow

- **GIVEN** a flow page with `pill: "Case type flow"` and `pillVariant: "teal"`
- **THEN** the pill beside the flow's name is teal
