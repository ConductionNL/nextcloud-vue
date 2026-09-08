---
kind: code
---

# Proposal: saved-views-shared-by-role

## Summary

Let a saved view be shared with a group, read-only or editable, and let
`CnSavedViewsControl` list and apply the views shared with the current user
next to their own. A shared view carries its columns and its label, so a
department sees one list the same way.

Opened from the dossiq competitor analysis, round 2, Tier B row B07
(`concurrentie-analyse/procest/_round2/compare/tier-b-and-sibling.md`).
Decision D10 (Ruben, 2026-09-08): platform rows get a proposal now;
implementation is a separate step.

## Motivation

dossiq's Cases, Queue and Tasks pages carry `allowSavedViews: true`, and every
view is personal (M1 9.4). A team lead who builds the right lens for the
handling desk cannot hand it to the desk. Two of three competitors can:

- xxllnc Zaaksysteem shares a saved search with a department plus a role, with
  a "may edit" switch, and stores columns and labels on it
  (`xxllnc-zaken/round2/pages/UitgebreidZoeken-nieuw.md`).
- Valtimo GZAC saves a search per user only
  (`valtimo/round2/pages/CaseList.md`), the weaker half.

The dossiq baseline: `_round2/dossiq-baseline/pages/Cases.md` and
`Tasks.md`, personal views only.

## Affected projects

- `nextcloud-vue`: `CnSavedViewsControl` and the `saved-views-ui` capability.
- `openregister`: the views API must persist `sharedWith` and scope the listing.
  That half is proposed in the OpenRegister repo; this change assumes the
  response shape below and degrades when it is absent.
- Consumers: dossiq (Cases, Queue, Tasks), opencatalogi, pipelinq, any
  `CnIndexPage` with `allowSavedViews`.

## Backward compatibility

`allowSavedViews` keeps its default `false`. A view without `sharedWith`
behaves as today. A views API that does not return `sharedWith` produces a
control without the sharing section and no error.

## Theming

Group chips reuse `NcChip` styling through Nextcloud CSS variables. No new
colours.
