# Proposal: bulk-band-action-icons

## Why

The boards draw the bulk band's actions with an icon before the label ("Andere behandelaar", "Andere status",
"Opschorten", "Hervatten", "Termijn verlengen" on DqZaken, DqZakenSorteren, DqFilterInMenu). dossiq declares the icons
(`bulkActions[].icon`), but CnActionsBar's band drew the label only (COMPDIFF r22 `icon true>false` on 15 buttons).

## What changes

A bulk action's `icon` draws as a 16px CnIcon in the band button's icon slot. An action without one is unchanged.

## Scope

nextcloud-vue, CnActionsBar. No schema change: `bulkActions[].icon` is already accepted.
