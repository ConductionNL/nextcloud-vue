# A saved view can be shared with the reader's own groups only

## Why
The share picker of a saved view offers every group Nextcloud's sharee API answers. A case list whose views belong to
teams needs the picker to offer only the teams the reader is in, so a view is not handed to a group outside them.

## What changes
`CnSavedViewShareFields` takes `shareGroups`: `all` (default, unchanged), `mine` (the groups the current user is in) or
an array of group ids. People stay pickable. `CnSaveViewDialog` and `CnSavedViewShareDialog` pass it through, and
`CnIndexPage` takes it as `savedViewsShareGroups` (manifest `config.savedViewsShareGroups`, schema 2.177.0).
