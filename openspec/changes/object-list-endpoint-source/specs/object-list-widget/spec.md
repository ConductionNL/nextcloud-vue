# object-list-widget Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [object-list-endpoint-source](../../)

## ADDED Requirements

### Requirement: A list can read its rows from an app endpoint

An `object-list` with `content.endpointSource` SHALL read its rows from that endpoint, with tokens in its url and params
resolved against the record, and SHALL NOT read OpenRegister. The payload at `responsePath` SHALL be the rows, or an
object with `results` and `total`. A refused read SHALL show the list's load error and no rows.

#### Scenario: DqZaakAssistent

- **GIVEN** the AI-toezicht list reads `/apps/hermiq/api/ai-oversight/subject` with `subjectId: @objectId`
- **WHEN** a handler opens the tab on a case
- **THEN** the list shows hermiq's oversight records of that case
