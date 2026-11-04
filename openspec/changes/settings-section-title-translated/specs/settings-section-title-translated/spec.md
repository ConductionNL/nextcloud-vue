# settings-section-title-translated

## ADDED Requirements

### Requirement: A declared settings section translates its title

CnSettingsFieldsSection SHALL pass its `name`, `description` and `detailedDescription` through the app's translate
function, as it does its field labels, hints and placeholders.

#### Scenario: Board PqBeheer

- **WHEN** pipelinq declares the section "Lead Management" and the Dutch catalogue maps it to "Leadbeheer"
- **THEN** the card title reads "Leadbeheer"

#### Scenario: An app translated the title itself

- **WHEN** an app passes a title it translated already
- **THEN** the card shows that title unchanged
