# Proposal: board-dialog-raised-label-line

## Why

Every dialog board draws a labelled field the same way: the label's box where the field starts, the control 23px under
it (measured on the flattened boards: 72 fields on 11 boards, DqArchiveren, DqBerichtVersturen, DqBesluit,
DqFilterBewerken, DqFilterDelen, DqNieuweZaak, DqOverdragen, DqUwWachtrij, DqZaakLocatie, DqZaakSamenwerken,
DqZaakDialogen). A board dialog's raised label on live sat 2px below the field's start on a 20px line and the control
28px under it (DqOverdragen r29: gapBelowTitle 50 vs 47).

## What changes

In a board dialog, a field with a raised label (NcInputField, NcTextArea, NcSelect) leaves 21px of room above its
control (was 26) and its label takes the font's normal line (was 20px), 4px above the control's box as before. Checked on
:8080 with the rules injected: label at 0, control at 23 for "Nieuw team" (select) and "Waarom de zaak verhuist"
(textarea).
