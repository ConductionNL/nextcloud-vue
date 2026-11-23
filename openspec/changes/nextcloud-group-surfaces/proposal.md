---
kind: code
---

# Proposal: nextcloud-group-surfaces

## Summary

A team is a Nextcloud group (Ruben, 2026-10-09, dossiq PR #3533). The create
and edit dialogs already pick a group for a property marked
`referenceType: nextcloud-group`. Three other surfaces still treat the group id
as plain text. This change closes them.

1. The inline editor on a detail page (`CnObjectDataWidget`) picks a group, or
   a user, from a searchable list instead of a text box.
2. A table cell (`CnCellRenderer`, so `CnDataTable`, `CnObjectListWidget` and
   every widget table) shows a group's display name instead of its id.
3. A new filter token `@myGroups` resolves to the ids of the groups the
   current user is in, sent to OpenRegister as an IN filter.

## Motivation

dossiq's case page edits `assignedGroup` in its Data and Seats panels as a
typed group id, its Cases index shows the raw id in the Team column, and its
"Your team's queue" preset cannot filter on `assignedGroup` because no token
names the reader's groups. The manifest note on that preset
(`_userWidgetsNote`) records the gap.

## Affected projects

- [ ] `nextcloud-vue`: `CnObjectDataWidget`, `CnCellRenderer`, new
      `CnGroupNameCell`, `utils/groupAutocomplete.js` (cached display name),
      `utils/widgetVisibility.js` (reactive group peek),
      `utils/resolveFilterTokens.js`, `utils/sentinelTokens.js`,
      `schemas/app-manifest-v2.schema.json`, docs.
- [ ] `dossiq`: adopts all three in a follow-up stacked on #3533.

## Out of scope

- A group cell for an array of groups beyond a comma separated list of names.
- Any server change in OpenRegister: a repeated `field[]` param is already an
  IN filter there.
