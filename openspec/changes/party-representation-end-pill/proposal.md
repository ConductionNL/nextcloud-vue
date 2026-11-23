# A representative's row names when the representation ends

## Why
DqZaakBetrokkenen "Rollen" (design-system #811) draws a warning pill "Machtiging tot 31 dec" on J. van Wijk, who acts for Aannemersbedrijf Van Wijk B.V. under Awb 2:1. OpenRegister already stores when a party link ends (`validUntil`), but the parties widget never showed it, so live drew no pill.

## What changes
`content.representationUntil` (words with `{date}`) puts a warning pill at the end of the row of a party that represents another party (the role rows' `representedParty`) and whose link has a `validUntil`. The date reads as the board writes dates: day and short month, the year only outside the current one. Other parties, and a widget without the words, draw nothing. Both looks. No schema change.
