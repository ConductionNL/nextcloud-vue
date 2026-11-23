# A record list row can lead with an icon tile

## Why
DqZaakTaken draws "Wat hierna komt" with a 36px round calendar tile before each planned action. Live set the text at the card inset and showed no tile (r31: first row inset 23 against 32), although the page already configures `icon`: `rows` never drew it.

## What changes
`iconTile: true` beside `icon` leads each `rows` row with its icon (18px) in a 36px round tile on the sunken ground. Without `iconTile` nothing changes.
