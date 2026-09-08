---
kind: code
---

# Proposal: index-ref-column-labels

## Summary

A `CnIndexPage` column over a `$ref` property renders a label field of the
referenced object instead of its uuid. A column object gains `labelField`,
the page fetches the referenced objects in one batch, and a filter on that
column offers the same labels. The same resolver serves the header chips and
the tabs count.

Opened from the dossiq competitor analysis, round 2, placement section 3
(`concurrentie-analyse/procest/_round2/compare/placement.md`) for findings
A35 and A36, and defect triage #8
(`concurrentie-analyse/procest/_round2/compare/dossiq-defect-triage.md`).
Decision D10 (Ruben, 2026-09-08): proposal now, implementation separate.

## Motivation

dossiq's Tasks index shows the case as a truncated uuid: the columns are
plain keys, `CnIndexPage` renders the raw value and resolves no `$ref`
(triage #8, `_round2/dossiq-baseline/pages/Tasks.md`). The Cases index has no
requester column because a party name cannot be shown (A35). Every competitor
shows the related name:

- Valtimo GZAC: Aanvrager and Aanvraagdatum columns on the case list
  (`valtimo/round2/pages/CaseList.md`).
- xxllnc Zaaksysteem: default column Aanvrager Samenvatting and filters
  Aanvrager and Betrokkene (`xxllnc-zaken/round2/search-anatomy.md`).
- Valtimo GZAC task list tabs Mijn taken, Niet toegewezen, Alle taken over a
  labelled assignee (`valtimo/round2/pages/TaskList.md`).

Today's workaround is `extend: ["case"]` plus a hand-written column
component per app.

## Affected projects

- `nextcloud-vue`: `CnIndexPage`, `CnDataTable`, a `useRefLabels` resolver,
  the `index-page` capability. `detail-header-field-chips` and
  `tabs-widget-visible-if` reuse the resolver.
- Consumers: all five; every index page with a reference column.

## Backward compatibility

A plain key column renders as today. `labelField` is opt-in per column. When
the reference cannot be resolved, the cell shows the id in mono, as before,
with no error.

## Theming

None.
