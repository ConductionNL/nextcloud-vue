---
kind: code
---

# Proposal: saved-filters-manage-and-defaults

## Summary

Ruben, 19 October 2026: the control that stores the current filters is called
**Filter opslaan** ("Save filter"), a saved filter can be edited, shared and
deleted from one manage menu, and an app can ship **default filters** through
its manifest.

## What exists today (read on development, ce70fdbad)

- `CnSavedViewsControl` lists OpenRegister views (`/apps/openregister/api/views`)
  as chips (board look) and as menu rows. Each row is an `NcActionButtonGroup`
  of icon-only buttons: share and delete for an owner, presentation for owner
  or write, update for write, copy for read. Delete exists, behind an unlabelled
  trash icon, which is why it reads as missing.
- An owner cannot rename a view or put the current filters into it. Only a
  write member can update the criteria.
- Sharing is with groups only, `sharedWith: [{group, mode}]`, through
  `CnSavedViewShareFields` (NcSelect with `inputLabel`, sharee API).
- `savedViewTree.seeded[]` in the manifest schema declares views that ship with
  the app, read-only and copyable. Nothing reads it: no component consumes
  `savedViewTree`, a seeded entry carries no criteria, and OpenRegister has no
  `seeded` field, so the "seeded" group in `buildViewTree` is never filled.

## What changes

1. **Label.** "Save view" becomes "Save filter" (nl "Filter opslaan") on the
   board-look button, the header `save-view` action and the save dialog;
   "Saved views" becomes "Saved filters". Strings only; the component, prop,
   event and API names stay `view`, because the stored entity is OpenRegister's
   View and renaming it would break every consumer.
2. **Manage menu.** Each row is the name (applies it) plus one "Manage" button
   that turns the menu into that filter's own menu: Edit, Share, Presentation,
   Update with current filters, Save a copy, Delete. Each entry is a labelled
   `NcActionButton` and appears only when the caller's access allows it. A Back
   entry returns to the list.
3. **Edit.** A new `CnSavedViewEditDialog`: rename, and optionally replace the
   criteria with the current filters, search and sort. Saved with `PATCH`
   carrying only `name` and, when chosen, `query`.
4. **Delete** keeps the existing confirm dialog, now reached by a labelled entry.
5. **Defaults.** A new index-page key `config.defaultSavedFilters[]`
   (`slug`, `name`, `filters`, optional `search`, `sort`, `label`). The page
   renders them as read-only views in a "Default filters" section above the
   user's own. They are never stored: the manifest is the install path, so a
   new app version updates every user's defaults at once and no user can delete
   one. Applying a default resolves its `@me` / `@today` tokens through the same
   context the quick filters use. "Save a copy" stores a personal view with the
   tokens unresolved, which the user then owns and may edit, share and delete.

## Out of scope, needs OpenRegister (see `openregister/openspec/changes/saved-view-user-shares`)

Sharing with individual users. The library side (users in the same picker) is
specified here as Requirement "Share with users and groups" but is built only
after OpenRegister accepts `{user, mode}` entries.

## Decisions taken

- Defaults are manifest config rendered client-side, not OpenRegister rows.
  Read-only, copyable, cannot be deleted, cannot be shared (sharing a default is
  pointless: everybody already has it).
- `savedViewTree.seeded` stays in the schema untouched; `defaultSavedFilters` is the
  key that installs filters. Folding `seeded` into it is a follow-up for Ruben.
