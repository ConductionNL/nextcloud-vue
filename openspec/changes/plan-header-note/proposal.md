# A plan card can put a note at the right of its title row

## Why
DqZaak and DqZaakMeer draw "Zaakplan" with "Mijlpalen en onderdelen van dit Woo-verzoek" at the right end of the title
row (14px, muted). The plan widget only had the widget's `subtitle`, which the card draws as a second line under the
title: r34 measured the first row 42.7px under the title where the board has 23.

## What changes
`content.headerNote` (a string, translated by the app) is reported as the card header's note, which the host draws at
the right of the title row, as the map card's count note does. Without it nothing changes. No schema change.
