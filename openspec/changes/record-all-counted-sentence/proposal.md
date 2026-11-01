# The record-all sentence counts the notes filled in

## Why

DqDagAfsluiten draws "Klaar voor vandaag?" with a sentence that counts what
the button will record: "De knop legt de 2 ingevulde notities en hun uren vast
op hun zaak." The card's sentence was a static text widget, so it could not
count, and the notes list that knows the count drew only the button pair there.

## What changes

`noteAction.recordAll.text` also takes count forms (`{ zero?, one?, other }`,
`{count}` the notes filled in now). `recordAll.placement.sentence: true` places
that sentence with the pair, above the ruled band, in the card the placement
names. A plain string sentence works as before.
