# Proposal: board-tonal-card-actions

## Why

The Pq boards draw a card's own actions as the light-blue tonal pill: "Bon printen" and "Bon mailen" (PqKassabon),
"Goedkeuren", "Afwijzen" and "Afstorting toevoegen" (PqKassadienst), "Opzoeken in de BRP" (PqWerkplekKlant),
"Instellen" on a connection that is not set up (PqIntegrations) and "Product toevoegen" under a lead's products
(PqLead). Live drew them as 40px or 34px white buttons with a grey edge and an 8px radius.

A facts card's `actions[]` already go through CnActionButtons, which draws `variant: "tonal"` as the pill since
board-tonal-button, so those need only the manifest variant. An object list's Add and the connections panel's
"Set up" had no way to be the pill.

## What changes

- An object list takes `content.addVariant: "tonal"`. Its Add, the empty state's Add and the extra adds
  (`addActions`) then carry `cn-button--tonal` and are not stretched across the card; on a board card the title-row
  Add and its extra adds carry it too.
- CnConnectionsPanel draws "Set up" on a connection that is not set up as the tonal pill. "Open settings" on a set up
  connection stays the secondary button.

Off by default for lists, so Dq boards, which draw a list card's Add as the outlined secondary button, keep it. The
connections panel is mounted by pipelinq only. No schema change.
