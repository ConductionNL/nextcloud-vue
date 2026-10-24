# An object list can say its counts beside the card title

## Why

DqZaakContact draws "4 vastgelegd" at the right of the "Contactmomenten op
deze zaak" title, the way a record list's `headerNote` ("3 in totaal") sits.
CnObjectListWidget could only put its counts under the title
(`headerSubtitle`), so live drew them as a second line.

## What changes

CnObjectListWidget `content.headerNote`: the same count grammar as
`headerSubtitle` (`{total}`, `{count:<field>=<value>}`, through the host
translate), reported to the card as its header `note`, which the card draws
beside the title. An empty note clears one shown before.
