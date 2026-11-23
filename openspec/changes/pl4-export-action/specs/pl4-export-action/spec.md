# pl4-export-action Delta: pl4-export-action

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [pl4-export-action](../../)

## Purpose

A page's export action downloads the OpenRegister records it names, without an app handler.

## ADDED Requirements

### Requirement: An export action can export OpenRegister objects

When an `export` action names no `handler`, the export dialog's confirm SHALL download the picked entity's
OpenRegister objects (`register`, `schema`, `filter`) in the chosen format through OpenRegister's export endpoint, and
report success. An action without a picker SHALL use its own `register` and `schema`. When neither a handler nor a
register and schema are named, the dialog SHALL report an error and download nothing. Entity labels SHALL run through
the app's translate.

#### Scenario: Requests from a dashboard

- **GIVEN** a header action `{ type: "export", entities: [{ id: "requests", label: "Requests", register: "pipelinq", schema: "ticket", filter: { ticketType: "request" } }] }`
- **WHEN** the user picks Requests and CSV and confirms
- **THEN** the browser downloads `/apps/openregister/api/objects/pipelinq/ticket/export?format=csv&ticketType=request`
