---
kind: code
---

# Proposal: record-list-header-href-params

## Summary

Boards DqContact and DqOrganisatie head the Tickets card with "Alle 2 tickets bekijken", a link into pipelinq for that
party (`/apps/pipelinq/tickets/party/{ref}`, pipelinq feat/tickets-list-by-party). A record list's header link could
name a route of this app (with tokens) or a fixed `href`; another app's page needs a value of the record in its path.

`headerLink: { label, href, params }` now fills `{name}` placeholders in `href` from `params` (tokens such as
`@object.masterEntityRef` resolved, values URL-encoded) and makes the path a Nextcloud URL. While a value is missing
the link is left out. An `href` without `params` is used as written, as before.

## Scope

- `src/components/CnRecordListWidget/CnRecordListWidget.vue`: `headerLink` + `filledHref`.
- No schema change (widget content is open).
