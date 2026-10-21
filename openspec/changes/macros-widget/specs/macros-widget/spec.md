# macros-widget Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [macros-widget](../../)

## ADDED Requirements

### Requirement: A page can list and run the macros of its record

A `macros` widget SHALL list the declared actions of the record's schema that are macros with a bound flow, in
declaration order, each with a button that runs it through OpenRegister's declared-action endpoint. After a run it
SHALL ask the page to refresh; a refused run SHALL show the refusal and SHALL NOT be shown as the last run. The last run
SHALL come from the record's audit trail and SHALL be left out when the trail cannot be read.

#### Scenario: DqZaakAssistent

- **GIVEN** a case whose schema declares "Woo-verzoek afronden" and "Opschorten voor aanvulling" as macros
- **WHEN** the handler presses "Uitvoeren" beside "Opschorten voor aanvulling"
- **THEN** OpenRegister runs that macro as the handler and the page refreshes
- **AND** the card says it ran last
