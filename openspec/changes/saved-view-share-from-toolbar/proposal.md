# Share the open saved view from the toolbar

## Why
Board PqTicketsSelectie (design-system #826) draws a saved view of the tickets list ("Klachten deze week") open, with "Delen: Klachten deze week" beside "Weergave opslaan" in the toolbar, and the share dialog it opens: "the same dialog as in dossiq". The library has that dialog (CnSavedViewShareDialog, saved-views-shared-by-role) but reaches it only through the side panel's view menu, so a reader who has a view open has to find it in the panel to share it.

## What changes
- `CnSavedViewsControl` takes `shareView`: when set, a "Share: {name}" button beside Save view emits `share-request`.
- `CnIndexPage` takes `savedViewShare` (manifest `config.savedViewShare`, default false) and passes the open view to the control when it is a stored view the reader owns. The request opens the existing share dialog through the existing `onShareViewRequest`, so saving the audience is the same PATCH as from the panel.

## Out of scope
Who may share stays as it is: only the owner; a default view and a view shared with the reader get no button. The dialog itself does not change.
