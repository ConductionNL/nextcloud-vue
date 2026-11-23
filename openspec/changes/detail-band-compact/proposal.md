# Proposal: detail-band-compact

## Why

Boards PqKlant and PqOrganisatie draw the contact strip and a row of six figures across the page, above the tabs and
the side column. The figures are small white tiles (12px 14px, a 13px label over a 20px value, 67px high) 12px apart.
The band (detail-band) can place them there, but it keeps 20px between tiles and a 220px minimum, so six figures in a
1120px page wrap, and a stat draws the dashboard's larger tile.

## What changes

A detail page takes `config.bandDensity: "compact"`. In the board look the band then keeps 12px between tiles and 20px
between rows, lets a tile shrink to 120px, and draws a stacked stat as the small white tile. Without it the band is
unchanged.
