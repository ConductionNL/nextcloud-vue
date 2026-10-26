# Proposal: saved-view-icon-description-count

## Why

Ruben (23 Oct, on the "Weergave bewerken" dialog of dossiq's case list): a saved view needs an icon, chosen in the save
and edit dialogs and shown before the view under "Mijn weergaven" in the menu; a description, edited in the same
dialogs and shown as the tooltip of that menu entry; and a count after each view in the menu, as Mijn werk (99) and
Wachtrij (142) carry, of the objects the view's criteria match. Default views get the same from config. Today every
view shows the fallback icon, no tooltip and, unless it declares `overrides.badge`, no count.

## What changes

- `CnSavedViewLookFields`: a description field and an icon choice (a radio group of icons from the shared semantic
  vocabulary, so each resolves in the menu). Used by `CnSaveViewDialog` and `CnSavedViewEditDialog`, whose `confirm`
  now carries `description` and `icon`.
- `CnIndexPage`: a new view is saved with its description and `query.icon` (OpenRegister keeps a view's query whole,
  so no server change); an edit patches a changed description and icon. A view in the menu counts the objects it
  matches by default, through the existing menu counters (one `_limit=1` read, refreshed on object changes);
  `overrides.badge: false` turns it off.
- `savedViewMenu`: entries carry `icon` and `description`; `savedViewIcon(view)`; the default icon is FilterVariant
  (as DQ-L10 c4996b39c2).
- `CnAppNav`: an entry's `description` is its tooltip.
- `defaultFilterViews`: a default view keeps its declared `icon`.

## Scope

nextcloud-vue. STACKED on feat/r25-default-views-secondary (default view `description`, schema 2.152.0) and
fix/r25-saved-view-menu-by-uuid, and merges DQ-L9 feat/r25-saved-view-summary-filter-labels 527f02b657 (the readable
criteria summary in the edit dialog). Three new l10n keys.
