---
kind: code
---

# Proposal: row-menu-edits-when-the-row-opens-the-detail

## Why

On 9 Oct Ruben ruled on the row action menu of an index list: when a click on
the row already opens the record's detail page, the menu must not offer "View"
or "Open" as well. Viewing is what the row click does. A second way to view
is noise in a menu that should hold the things a row click cannot do. The menu
offers "Edit" (Dutch "Bewerken", pencil icon) instead.

A record that has no detail page keeps "View", because there the menu is the
only way to see it.

## What changes

- `CnIndexPage` leaves the built-in View out of a row's menu (and of the
  right-click menu, which uses the same per-row list) when a click on that row
  navigates to a detail page.
- The built-in Edit stays, with the pencil icon, labelled "Edit" and, in the
  Dutch catalogue, "Bewerken". Its toggles and the `update` permission verb
  govern it as before.
- A row whose `viewTo` answers null has no detail page and keeps View.
- Actions the page declares itself, and links to other places, are untouched.
- It is a behaviour rule, not a look: it applies in both the Nextcloud and the
  board look.

## Out of scope

- What the row click does, and what Edit does when chosen (`editOpensDetail`
  decides between the modal and the detail page, as before).
- Changing the default of `showViewAction`: a page with no detail route keeps
  the View built-in.

## Impact

Behaviour change for pages that have both a row-click listener and the default
built-ins: View disappears from their row menu. Minor version.
