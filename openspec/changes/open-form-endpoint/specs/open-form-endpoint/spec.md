# open-form-endpoint Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [open-form-endpoint](../../)

## Purpose

A page can edit a record that lives behind an endpoint, not in a register.

## ADDED Requirements

### Requirement: An open-form action can edit a record through an endpoint

An `open-form` action with `endpoint.url` SHALL read the record from `endpoint.loadUrl` (else `endpoint.url`) at
`endpoint.responsePath`, open the form with the fields `formProperties` declares filled in from it, and on confirm send
only those fields to `endpoint.url` with `endpoint.method` (PATCH by default, or PUT). Tokens in the URLs resolve against
the page's record. When the record cannot be read the form SHALL NOT open.

#### Scenario: Edit an organisation

- **GIVEN** an organisation's page with an Edit action on `PUT /apps/openregister/api/organisations/@objectId`
- **WHEN** the administrator changes the name and saves
- **THEN** the name and the other declared fields are sent with PUT, and the page refreshes
