# Proposal: object-list-table-frame

## Why

pl4 on boards PqKassabon (Regels, 8), PqKassadienst (Afstortingen, 7), PqKassa, PqKassaRetour, PqLoyaliteit and PqLead
(products, 9): the board draws a card's list as a framed table inside the card's padding. It has a 1px frame with an 8px
radius, a white head with a rule under it, and 18px start and end insets. Every row has a rule under it, except the
last, where the frame closes the table. Live drew the board's compact card table instead: no frame, a grey head band
and 12px insets.

Dossiq's card tables are drawn without a frame (DqTenant "Mandaten") or edge to edge (`tableBleed`), so the frame is
an opt-in.

## What changes

`CnObjectListWidget` takes `content.tableFrame: true`. In the board look on a detail page the list's table then:

- has a 1px frame in the border colour with an 8px radius;
- has a head on the main background with a 1px rule under it;
- pads its first and last cells 18px at the outer edge;
- pads its cells 12px at the top and bottom, with a rule under each row except the last.

Without the key, nothing changes. The Nextcloud look is unchanged.
