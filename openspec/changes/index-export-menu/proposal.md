---
kind: code
---

# Proposal: index-export-menu

## Summary

Board DqZaken draws "Exporteren" as a menu: CSV and Excel, each with a muted description, and a note under them ("Het platform maakt het bestand, met uw rechten."). The same page's board view (DqWerkbord) reads "Downloaden". The header Export was one button, and the board view mode could not carry its own header buttons.

## Scope

- `src/components/CnIndexPage/CnIndexPage.vue`, `src/components/CnIndexPage/CnIndexHeaderMenu.vue`, `src/css/index-page.css`, docs, `tests/components/CnIndexPageExportMenu.spec.js`.

## Out of scope

- The app manifests that configure it; this is the library half.
