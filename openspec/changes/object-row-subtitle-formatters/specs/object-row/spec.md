# object-row Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [object-row-subtitle-formatters](../../)

## ADDED Requirements

### Requirement: A list row's subtitle token can read through a formatter

A `subtitleTemplate` token `{field|formatter}` SHALL read the field through the host's formatter of that name
(`cnFormatters[formatter](value, row)`). An empty answer SHALL drop the part and its separator. An unknown formatter
SHALL leave the raw value. A token without a formatter SHALL read as before.

#### Scenario: DqTeamwachtrij

- GIVEN the template "{identifier} · {status|statusTypeName} · {priority|priorityPhrase}"
- AND formatters that name the status "Ontvangen" and the priority "prioriteit hoog"
- THEN the line reads "2026-0076 · Ontvangen · prioriteit hoog"
