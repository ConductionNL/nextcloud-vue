# Proposal: board-active-filters-right-of-hint

## Why

DqWerkbord draws the board view's hint ("Een kolom per waarde van de eigenschap. Sleep een kaart om de status te
wijzigen.") on the left and the active filters ("Actief: [Type: Woo-verzoek ×] … Alles wissen") pushed to the right edge
of the same line. Live put "Actief:" straight after the hint, so the chips run on from the sentence.

## What changes

In the board look, when the board view's hint precedes the active filters in the search row, the "Active:" label takes
the free space before it (`margin-inline-start: auto`), so the chips and "Clear all" sit at the right. Without a hint (the
table, DqZaken) the chips keep following the search field. No schema change.
