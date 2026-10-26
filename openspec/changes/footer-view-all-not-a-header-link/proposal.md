# A footer view-all is not a header link

## Why
DqZaakTaken (r25b, 24 Oct): the tasks table draws "Alle taken van deze zaak in Taken" under the table
(`viewAllPlacement: "footer"`), and the tab strip drew the same link again beside Acties. The extra link pushed the
Historie tab onto a second row; the board draws one link, under the table.

## What changes
`widgetHeaderLink` answers null for a view-all the widget puts in its footer, unless the content declares an explicit
`headerLink`. The tab strip and the card header both read it. No schema change.
