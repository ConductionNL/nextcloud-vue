# Proposal: board-map-missing-card

## Why

COMPDIFF r23, DqZakenKaart "3 zaken zonder adres": the card's title was 14px on a 21px line against 15px on 18px, its
first content 18px below the title against 9px, and that content started 32px in against 15px. The content is "Toon ze
in de tabel", which the board draws as a link flush with the title; live drew NcButton's tertiary button, 34px high with
its own padding.

## What changes

In the board look only, the map view's missing-address card sets its title at 15px on its normal line height and draws
the table button as a link: no padding, border or minimum height, 14px weight 600. It stays a button.

The Nextcloud look is unchanged. The board's sentence naming the cases without a location is not part of this change.
