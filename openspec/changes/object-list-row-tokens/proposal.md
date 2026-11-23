# Proposal: object-list-row-tokens

## Why

A row action on CnObjectListWidget cannot name the row it runs on in its target or request: the page tokens read the
page's record, not the row. Ruben chose a per-object-row "Alle zaken op dit object" link on DqZaakGerelateerd, which
needs the row's id in the link.

## What changes

`@row.<field>` and `{field}` (dot paths) in a row action's `target`, `url`, `payload`, `params`, `props`, `query` and
`filename` fill from the row (`utils/rowTokens.js`). `{objectId}` and the page's `@`-tokens keep reading the page. A
`navigate` row action whose target holds a row token renders as a link per row (in-app through the router, external as
an href). An action without row tokens is unchanged.

## Scope

nextcloud-vue; `@row.<field>` is the token the field-list widget already uses (sentinelTokens `row`).
