# Proposal: board-saved-view-manage-menu

## Why

DqFilterBeheren and DqFilterInMenu draw a saved view's manage menu ("Beheer Termijn deze week") as a 264px card: rows
of at least 40px with the label at 600 and its explanation in 12px muted text under it, a refresh icon on "Bijwerken
met huidige filters", "Kopie opslaan" on the reader's own view, a separator and "Verwijderen" in the error red. The
panel marks a view that is in the app menu with a small pin before its name. Live draws the generic board menu (400
weight, 36px rows, no separator, Delete in the text colour), offers no copy of an own view and shows no pin.

## What changes

- Board look: the manage menu's popover, rows, descriptions, separator and Delete colour as the boards draw them.
- `CnSavedViewsPanel`: "Save a copy" for the owner too; a separator before Delete; the Refresh icon on "Update with
  current filters"; in the board look a 14px pin before the name of a view in the app menu; the row's accessible name
  says ", in the menu" when the view is in the menu.
- `CnIndexPage`: a copy of the reader's own view is named "{name} (copy)", so the two do not read alike. A copy of a
  shared or default view keeps its name as before.

## Scope

nextcloud-vue only. No schema change. Two new l10n keys (en, nl).
