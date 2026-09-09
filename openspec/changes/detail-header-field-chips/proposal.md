---
kind: code
---

# Proposal: detail-header-field-chips

## Summary

Let a manifest detail page name object fields that render as chips in the
`CnDetailPage` header, beside the subtitle: a number, a status badge, an
assignee, a deadline. Today the header shows an eyebrow and a title; every
identifying field sits in a data widget below the fold.

Opened from the dossiq competitor analysis, round 2, placement section 3
(`concurrentie-analyse/procest/_round2/compare/placement.md`) for finding
A01. Decision D10 (Ruben, 2026-09-08): proposal now, implementation separate.

## Motivation

dossiq's CaseDetail renders the eyebrow CASE and the title. Identifier, case
type, status, assignee and deadline exist on schema `case` and sit inside the
widget case-core, 8 of 12 shown
(`_round2/dossiq-baseline/case-detail-anatomy.md`, Header). All three
competitors put the identity in the header:

- OpenCase: chips for number, type, status and organisation, plus a breadcrumb
  (`opencase/round2/case-detail-anatomy.md`, Header).
- Valtimo GZAC: a status pill and an assignee link
  (`valtimo/round2/case-detail-anatomy.md`, Header).
- xxllnc Zaaksysteem: a left info card and a top-bar title "Zaak 2:
  Beveiligingsanalyse" (`xxllnc-zaken/round2/case-detail-anatomy.md`).

## Affected projects

- `nextcloud-vue`: `CnDetailPage` header, `useDetailView`, the manifest v2
  schema for detail pages, a new `detail-page-header` capability.
- Consumers: dossiq (CaseDetail, TaskDetail), pipelinq (deals), hermiq,
  humaniq, any manifest detail page. Config only for the app.

## Backward compatibility

A page without `headerFields` renders as today. The chips row is absent, not
empty.

## Theming

Chips use `NcChip` and the existing status colour map from `CnStatWidget`,
which reads `--color-*-text` tokens. No hardcoded colours.
