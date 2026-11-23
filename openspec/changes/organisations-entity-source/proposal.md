---
kind: code
---

# Proposal: organisations-entity-source

## Summary

Let a manifest list and show OpenRegister organisations. `entitySource:
"organisations"` on a `type: "index"` page lists the organisations the viewer
belongs to; the same name on a `type: "detail"` page shows one organisation,
with the header, pills, widgets and `@objectId` / `@object.*` tokens an object
page has.

## Why

An organisation is not a register/schema object, so neither page could load
one from config, and an app that shows a tenant needed a custom page. The
named-source registry already solves this for lists (`flows`, `tasks`); a
detail page had no counterpart.

## What Changes

- `useOrganisationStore` (internal): `load()` against
  `GET /apps/openregister/api/organisations`, `fetchRecord(uuid)` against
  `GET /apps/openregister/api/organisations/{uuid}`.
- `organisations` in `indexSources.js`: rows keyed on the uuid, columns name,
  status, type and created, no Add, and `loadRecord` / `record` /
  `recordError`, which make it a record source.
- `resolveRecordSource(name)` in `indexSources.js`.
- `CnDetailPage` takes `entitySource`: the record source's record becomes
  `currentObject`, so everything bound to it works unchanged. It wins over
  `register` + `schema`; a 403 or 404 shows the not-found state.
- Manifest schema: `organisations` joins the `entitySource` enum.

Access stays OpenRegister's: both endpoints answer from the session, and the
client adds no check and skips none.

## Out of scope

A meter row (value against a limit) on the facts widget for a quota card, as a
follow-up.
