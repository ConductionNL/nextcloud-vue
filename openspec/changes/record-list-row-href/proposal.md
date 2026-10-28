# Proposal: record-list-row-href

## Why

Pipelinq's client page (boards PqKlant and PqOrganisatie) lists the client's cases. The cases live in dossiq, so a row cannot open them through the app's router; the board draws each case as a linked row with a chevron.

## What changes

- `rowHrefField` on a record list names a row field holding a URL. A row without a route opens that page as a plain link, with the link styling and the chevron a routed row has.
- Only a path on this server (`/…`, not `//…`) or an http(s) URL is taken; anything else leaves the row unlinked.
