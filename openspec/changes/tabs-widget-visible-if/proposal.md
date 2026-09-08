---
kind: code
---

# Proposal: tabs-widget-visible-if

## Summary

Let a tab of a `tabs` widget declare a visibility condition, so a tab whose
panel would be empty is absent instead of blank. The condition reuses the
manifest's shared `$defs.visibleWhen` predicate, in its local form over the
page object and in its source form over a count of related rows.

Opened from the dossiq competitor analysis, round 2, placement section 3
(`concurrentie-analyse/procest/_round2/compare/placement.md`) for finding
A33. Decision D10 (Ruben, 2026-09-08): proposal now, implementation separate.

## Motivation

dossiq's case panels widget shows ten tabs that wrap to three lines at 1440
and sit below the fold at 1024; two tabs are dead, one blank
(`_round2/dossiq-baseline/case-detail-anatomy.md`, Case panels). The
competitors show fewer tabs and hide the conditional ones:

- OpenCase: conditional tabs are absent rather than empty
  (`opencase/round2/case-detail-anatomy.md`, Tab strip).
- Valtimo GZAC: four tabs (`valtimo/round2/case-detail-anatomy.md`).
- xxllnc Zaaksysteem: a side menu of five where Kaart and Samenwerkingen are
  conditional (`xxllnc-zaken/round2/case-detail-anatomy.md`).

dossiq can cut its tab count by config once the library can hide a tab on a
condition. Without this, the only tool is to remove the tab for every case.

## Affected projects

- `nextcloud-vue`: `CnTabsWidget`, the manifest v2 schema for the `tabs`
  widget, a new `tabs-widget` capability.
- Consumers: dossiq (case panels), pipelinq, hermiq, humaniq. Config only for
  the app.

## Backward compatibility

A tab without `visibleWhen` always renders. The predicate schema is the
existing one; the validator gains one optional key on a tab entry.

## Theming

None.
