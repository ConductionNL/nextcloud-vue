---
kind: code
---

# Proposal: record-list-string-rows

## Summary

A record list reading an app endpoint could not draw rows that are plain
strings: its templates read paths off objects, so `["…", "…"]` drew empty rows.
Board DqZaaktypeOverzicht's Controle card reads dossiq's publish check, which
answers `{ findings: string[], warnings: string[] }`, and draws the warnings as
sentences in one warning box.

## What changes

- A row that is a string or number is read as `{ value }`: templates reach it
  as `{value}`, and a list without `title` shows the value itself.
- `presentation: "notice"` draws the rows as one paragraph in a box toned by
  `variant` (`info`, `warning`, `error`), after an optional `lead` with
  `{total}` filled in. The box is a `role="note"` with an icon; an empty list
  shows the empty text.

No schema change: `presentation`, `variant` and `lead` are widget content keys,
which the manifest schema does not enumerate.
