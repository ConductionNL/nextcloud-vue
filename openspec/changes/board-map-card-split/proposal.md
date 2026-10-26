# Proposal: board-map-card-split

## Why

COMPDIFF r25 measured the map view (DqZakenKaart) with the list column 452px wide where the board draws 409, and the
map 618 where the board draws 655. The board splits the card 3:2 over a 520px map and a 320px list, 18px apart; the
library splits it over 420 and 320, 16px apart.

## What changes

In the board look the map card gives the map a 520px basis and puts 18px between the map and its list, so the map takes
655px and the list 409 at the board's width. The Nextcloud look is unchanged. No schema change.
