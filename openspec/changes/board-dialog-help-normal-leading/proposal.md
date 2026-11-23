# Proposal: board-dialog-help-normal-leading

## Why

COMPDIFF r43 left PtUitnodigen and PtAccountUitgeven with the dialog's note card 16.2 and 20.1px below the board. Part
of that is the help line under an NcTextField or NcTextArea: the board look set it at line height 1.3, while every
dialog board, the dossiq ones included (DqZaakLocatie, DqOverdragen, DqNieuweZaak), draws a help line on the font's own
leading. Each help line stood 1.9px taller than drawn.

## What changes

In a board dialog the NcTextField and NcTextArea help line uses `line-height: normal`. Size, ink and the 4px step under
the control stay. Probed read-only on :8080 by injection: PtUitnodigen's note card rises 3.8px; none of the eleven
measured dossiq dialogs moves (0.0px). The Nextcloud look is unchanged.
