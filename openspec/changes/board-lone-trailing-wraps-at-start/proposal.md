# Proposal: board-lone-trailing-wraps-at-start

## Why

COMPDIFF r32, DqDashboard "Vastgelopen zaken": the board draws "12 dagen stil" as the row's trailing text, which wraps
under the title and number at the row's start in a 360px card (an 83px row). The aside that holds it was pushed to the
row's end and set at the body's 1.5 line height.

## What changes

In the board look only, a dashboard row aside that holds nothing but the trailing text starts at the row's start when
it wraps and sits at the font's normal line height. Beside the text it still ends the row, as the text block grows.
