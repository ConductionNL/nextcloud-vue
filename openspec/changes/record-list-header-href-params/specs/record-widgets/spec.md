# record-widgets Delta: record-list-header-href-params

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [record-list-header-href-params](../../)

## ADDED Requirements

### Requirement: A record list header link can fill its URL from the record

A record list `headerLink` with `href` and `params` SHALL fill each `{name}` in the href with the URL-encoded value of
`params.name`, tokens resolved against the record, and SHALL make a path starting with `/` a Nextcloud URL. While a
value is missing the card SHALL draw no header link.

#### Scenario: DqContact Tickets

- **GIVEN** `headerLink: { label: "View all {total} tickets", href: "/apps/pipelinq/tickets/party/{ref}", params: { ref: "@object.masterEntityRef" } }`
- **AND** Sanne de Vries with master entity `m-1` and two open tickets
- **THEN** the card links "Alle 2 tickets bekijken" to `/index.php/apps/pipelinq/tickets/party/m-1`
