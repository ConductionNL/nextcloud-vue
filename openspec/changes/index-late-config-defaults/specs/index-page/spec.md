# index-page Delta

## ADDED Requirements

### Requirement: Default filters can wait for an app-config value

An index page SHALL apply a default filter that names an app-config value (`@config.<key>?`) once that value arrives,
when the list still shows the defaults it opened with, and SHALL NOT replace a filter the person set or one from the
address.

#### Scenario: The default pipeline

- **GIVEN** `defaultFilters: { pipeline: "@config.defaultPipeline?" }` and an app config without `defaultPipeline`
- **WHEN** the host sets `defaultPipeline` to the sales pipeline
- **THEN** the list filters on that pipeline and shows it as a removable chip
