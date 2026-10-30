# header-meta-count-entity-source Delta

**Status**: proposed
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: A header count can read a named entity source

The v2 manifest schema SHALL accept a `headerMetaCounts` entry `{ entitySource }` naming one of the entity sources a
page can read, besides `{ register, schema, filter? }`, and SHALL refuse an entry that mixes the two or names an unknown
source.

#### Scenario: DqTenant header

- **GIVEN** `headerMetaCounts: { organisations: { entitySource: "organisations" } }`
- **THEN** the manifest validates, and the header reads "een van 6 organisaties op deze omgeving"
