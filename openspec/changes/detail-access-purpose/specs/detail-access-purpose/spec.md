# detail-access-purpose Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [detail-access-purpose](../../)

## Purpose

A detail page can require the reader to state a purpose, recorded by the app, before it shows a record.

## ADDED Requirements

### Requirement: A detail page can ask for a purpose before it opens

A detail page with `accessPurpose` SHALL show nothing of a record for which `accessPurpose.when` holds (or cannot yet be
decided) until a purpose is recorded: it SHALL ask with the offered purposes plus "Other", which needs a written
purpose, and SHALL POST `{ purpose, note }` to `accessPurpose.url` with `{objectId}` filled in. It SHALL open the record
only when the endpoint accepts, SHALL keep it closed and show the reason when the endpoint refuses, SHALL keep it closed
with a way to state a purpose when the reader cancels, and SHALL NOT ask again for the same record in the same browser
session. A record for which `when` does not hold SHALL open without asking.

#### Scenario: DqSociaalDomein

- **GIVEN** a case page with `accessPurpose.when` on `@context.caseType.specialDataCategories` notEmpty, opened on a Melding Jeugdwet case
- **WHEN** the reader picks "Handling the case"
- **THEN** the purpose is recorded and the case opens; opening it again in the session does not ask
