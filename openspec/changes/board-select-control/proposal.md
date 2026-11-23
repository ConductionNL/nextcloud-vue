# Proposal: board-select-control

## Why

COMPDIFF r21 measured the selects outside dialogs at 30px with a 35%-transparent edge, where the boards draw the
board control: 36px in a page's filter row and 40px elsewhere, with a 1px #828a95 edge. DqProcesanalyse "Periode" and
"Filteren op zaaktype", DqDoorlooptijd "Filteren op zaaktype", DqTermijnen "Jaar" and DqZaakHistorie were flagged, as
were DqZakenSorteren's two selects. NcSelect draws its field as an NcInputField 30px inside a 34px toggle, with the
faint ring Nextcloud 32 uses for inputs. That ring is also weaker than WCAG's 3:1 for a control's edge. Board dialogs
already restyle their fields.

## What changes

In the board look, outside a dialog, NcSelect's field gets a 1px edge in the board control colour and radius 8. Its
height comes from the select's clickable area: 40px, or 36px in a dashboard page filter
(`--cn-board-select-height`). The Nextcloud look and board dialogs are unchanged.
