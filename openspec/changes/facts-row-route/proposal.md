# Proposal: facts-row-route

## Why

DqZaaktypeVelden's Moedertype card shows "Erft van Omgevingsvergunning" with the parent case type as a link. A facts
`title` can link to a route; a `row`'s value cannot.

## What changes

A `row` entry takes `route` (`{ name, params?, query? }`, `@source.<path>` in a param), as a `title` does, and draws its
value as a link to it. A param that does not fill leaves the value plain.

## Scope

nextcloud-vue only. Widget content is not validated per key: no schema change. dossiq uses it on the case type page.
