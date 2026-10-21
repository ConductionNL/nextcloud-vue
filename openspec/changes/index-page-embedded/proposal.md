---
kind: code
---

# Proposal: index-page-embedded

## Summary

An app's admin settings page has no router and no CnAppRoot. A list there (pipelinq's POS roles, staff, tender types, product categories, pipelines, mail transports, messaging providers) could show rows, but opening one navigated nowhere, so each app wrapped CnIndexPage in its own manager component with its own dialog.

`embedded` makes the page open rows in place: a click (also on a selectable page) or the View action opens `rowModal` through the host's `cnOpenModal` with the row, else the built-in form dialog on the row. The host provides `cnOpenModal` and mounts the modals, the way dossiq's admin page already does for its substitution list. Add already opens `createModal` or the form dialog, and filters already stay off the url without a router.

Nothing changes without `embedded`.

A list on an admin page also edits fields the schema hides from the app's own pages (`visible: false`, such as a category's description). `fieldsFromSchema` now brings such a property back when its override says `hidden: false`, as it already does for the tenant.

## Scope

- `src/components/CnIndexPage/CnIndexPage.vue`, `src/utils/schema.js`, `docs/utilities/fields-from-schema.md`, `tests/utils/fieldsFromSchemaOverrideText.spec.js`, `docs/components/cn-index-page.md`, `tests/components/CnIndexPageEmbedded.spec.js`.
