# Proposal: reports-catalogue-dutch

## Summary

The reports catalogue (`CnReportsPage`) speaks Dutch to a Dutch reader: its category filter, the filter's "all" option and the empty text.

## Why

Measurement pl3 (28 October 2026), pipelinq board PqReports: the catalogue's category chip read "All categories" where the board draws "Alle categorieën". `CnReportsPage` translates four strings in the `nextcloud-vue` domain that `l10n/nl.json` did not carry.

## What changes

- `l10n/nl.json` and `l10n/en.json` get the four strings; they leave `tests/l10n/nl-missing-baseline.json`.
- `tests/l10n/reportsCatalogueDutch.spec.js` reads every key from the page's source, so a string added later without Dutch fails.
