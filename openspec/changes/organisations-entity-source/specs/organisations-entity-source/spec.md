## Purpose

Manifest pages that list and show OpenRegister organisations through the
named entity-source registry.

## ADDED Requirements

### Requirement: An organisations source lists the viewer's organisations

The registry SHALL resolve `organisations` to a source that loads
`GET /apps/openregister/api/organisations` with no parameters and renders its
`results`, each row keyed on the organisation's uuid, with the default columns
name, status, type and created and no Add action.

#### Scenario: The manifest line becomes an organisation list

- **GIVEN** a page `{ "type": "index", "config": { "entitySource": "organisations" } }`
- **WHEN** the page mounts
- **THEN** the list endpoint is requested without parameters
- **AND** each row's `id` is the organisation uuid
- @e2e exclude covered by unit tests over the request and the rows

### Requirement: A detail page can show one organisation

A `type: "detail"` page with `config.entitySource: "organisations"` SHALL read
`GET /apps/openregister/api/organisations/{objectId}` and use the organisation
as its record: title, pills, header fields, widgets and the `@objectId` /
`@object.*` tokens SHALL read it as they read a fetched object. The source
SHALL win over `register` + `schema`.

#### Scenario: The organisation feeds the pills and the token context

- **GIVEN** a detail page naming the source, with a status and a type pill
- **WHEN** the page mounts with an organisation uuid
- **THEN** the single read is the only request
- **AND** the pills show the organisation's status and type
- **AND** the object context carries the uuid and the organisation
- @e2e exclude covered by unit tests over the mounted page

#### Scenario: A refused organisation is not found

- **GIVEN** OpenRegister answers the single read with 403 or 404
- **WHEN** the page mounts
- **THEN** the not-found state renders
- @e2e exclude covered by unit tests over the mounted page
