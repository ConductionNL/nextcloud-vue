# Proposal: dashboard-card-action-dialog

## Why

DqCatalogus' "Uit de Store" card has "Importeren" in its title row: a dialog that takes a file. A dashboard card's header
action dispatched with the router only, so an `open-modal` action reached no dialog. On a detail page the same action
runs through the page's dispatcher and opens the app's registry dialog.

## What changes

CnDashboardPage injects `cnDispatchAction` (provided by CnPageRenderer) and runs a card's header action through it, as
CnDetailWidgetHost does. Outside the renderer nothing changes.

## Scope

nextcloud-vue only, no schema change. dossiq wires "Importeren" on the catalogue's Store card (DQ-ADMIN).
