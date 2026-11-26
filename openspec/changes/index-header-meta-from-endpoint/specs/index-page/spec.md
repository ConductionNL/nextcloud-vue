# Delta for index-page

## ADDED Requirements

### Requirement: The header note can read a value from an endpoint
An index page with `headerMetaSource` MUST read that endpoint (the request grammar of a widget's `endpointSource`) and fill `{source}` in `headerMeta` with the string or number it answers at `responsePath`. While it reads, after a failed read, or when the value is empty or not a string or number, the note MUST be left out.

#### Scenario: The groups list says when it was last synced
- GIVEN learniq's groups list with `headerMeta: "{source}"` and `headerMetaSource: { url: "/apps/learniq/api/cohorts/sync-line", responsePath: "line" }`
- AND the endpoint answers `{ line: "Bijgewerkt uit Magister om 07.00, 3 wijzigingen" }`
- WHEN the list opens
- THEN the header note reads "Bijgewerkt uit Magister om 07.00, 3 wijzigingen"

#### Scenario: No synced groups
- GIVEN the endpoint answers `{ line: "" }`
- WHEN the list opens
- THEN no header note is shown
