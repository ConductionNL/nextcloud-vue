## ADDED Requirements

### Requirement: A standalone board page header keeps the page header rhythm

In the board look, a CnPageHeader that no page primitive styles SHALL set its description 13px below the title, and its labelled buttons SHALL stand at the board control height (40px). Menu toggles and icon-only buttons keep their size.

#### Scenario: The weekly review header
- GIVEN pipelinq's Weekly review view in the board look
- WHEN it renders its CnPageHeader with "Opnieuw samenstellen"
- THEN the line under "Weekoverzicht" sits 13px below the title and "Opnieuw samenstellen" is 40px tall
