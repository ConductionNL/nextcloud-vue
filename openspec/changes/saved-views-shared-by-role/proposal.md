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

## Update, 7 October 2026: the backend is built

OpenRegister archived `view-group-share` on 2026-09-30 (main spec
`saved-search-views`, "A view can be shared with groups in read or write
mode"). Read on openregister development:

- A View carries `sharedWith: [{group, mode}]`, `mode` `read` or `write`,
  editable by the owner or an administrator. Sharing with a group that does
  not exist is refused.
- `GET /api/views` returns the caller's own views, public views and views
  shared with one of the caller's groups, each with `@self.access` `owner`,
  `write` or `read`.
- A member with `write` may change `query`, `presentation` and `alert`, and
  gets a 403 for a changed `sharedWith`, `owner` or a delete.

dossiq row `9.4` (re-read the same day) names the remaining gap: the dialog a
dossiq user saves a view in is `CnSaveViewDialog`, which offers only a public
switch (`CnSaveViewDialog.vue:28-31`), so the group picker belongs there as
well as in the edit form of `CnSavedViewsControl`. This update aligns the
change with that contract: the dropdown groups by `@self.access`, the share
fields sit in `CnSaveViewDialog`, and a writer's save never sends
`sharedWith`.

## Rows unblocked

- dossiq `9.4` "Shared saved searches with department or role permissions".

## Affected projects

- `nextcloud-vue`: `CnSaveViewDialog`, `CnSavedViewsControl` and the `saved-views-ui` capability.
- `openregister`: none. `view-group-share` is built (see above).
- Consumers: dossiq (Cases, Queue, Tasks), opencatalogi, pipelinq, any
  `CnIndexPage` with `allowSavedViews`.

## Backward compatibility

`allowSavedViews` keeps its default `false`. A view without `sharedWith`
behaves as today. A views API that does not return `sharedWith` produces a
control without the sharing section and no error.

## Theming

Group chips reuse `NcChip` styling through Nextcloud CSS variables. No new
colours.
