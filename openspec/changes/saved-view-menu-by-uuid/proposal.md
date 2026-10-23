# Proposal: saved-view-menu-by-uuid

## Why

Board DqFilterInMenu shows Pieter's saved view "Termijn deze week" in his menu. The example set can only name the view
by the uuid OpenRegister gave it (`{{view:<key>.uuid}}`, openregister example-set-view-placeholder), while the menu
list (`cn_saved_view_menu`) and the panel match a view by its id. The page's sync then drops the entry as a view that
no longer exists.

## What changes

- `syncSavedViewMenu` matches an entry by the view's id or uuid and stores it under the id from then on.
- `CnSavedViewsPanel.isInMenu` accepts the id or the uuid.

## Scope

nextcloud-vue. No schema change.
