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
2. **Saved filters live in the filters sidebar** (Ruben, 19 Oct, second
   round; boards from design-system #303). A third sidebar tab, Filters, lists them
   (`CnSavedFiltersPanel`): Save filter, the filters in Default filters, My
   filters and Shared with me, and per filter one labelled Manage menu with
   Edit, Update with current filters, Share, Save a copy, Add to menu or Remove
   from menu, and Delete, each gated by access; only the owner sees Edit,
   Share and Delete. There is no presentation entry: the boards draw none, so
   how a filter shows is no longer changeable from the list. The toolbar keeps the Save filter button and, under
   the board look, the chips that apply filters. A page with saved filters
   gets the sidebar unless it switched it off.
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

## Add to menu

A saved filter can be added to the app's menu and removed again. A previous
attempt (`savedViewPlaces`, removed in schema 2.40.0) wrote `favoredBy` on the
view, which only its owner may change, and gave a view its own route. This one
stores the list per user in the app's preferences endpoint
(`cn_saved_filter_menu`), so a recipient can add a shared filter and nothing on
the view changes; the entries form a "My filters" group in the menu and link to the page's own
route with `?savedFilter=<id>`, so there is no new route. No stored view changes shape.

## Sharing with users (Ruben, 19 Oct: users and groups)

`CnSavedViewShareFields` offers people and groups in one picker, from
Nextcloud's sharee API, so it follows the instance's own sharing settings like
the Files share dialog. A user share is `{user, mode}`; OpenRegister accepts it
with `saved-view-user-shares`. Until that lands a user share is refused there
with 400, and nothing is stored.

## Decisions taken

- Defaults are manifest config rendered client-side, not OpenRegister rows.
  Read-only, copyable, cannot be deleted, cannot be shared (Ruben confirmed).
- `savedViewTree.seeded` is deprecated in the schema, pointing at
  `defaultSavedFilters`. Deprecating is the smaller change and loses nothing:
  nothing ever read `seeded`, and its entries carry no criteria to read.
