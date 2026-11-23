# Proposal: board-dialog-theme

## Why

The boards draw a dialog with a 12px radius, a soft shadow, and its title and fields 24px from the edge (DqNieuweZaak
and ten other dialog boards; COMPDIFF F028, F029, F033, F035). Live, under the nldesign theme, the radius was 8px (the
theme sets it with `!important` through its dialog radius token), the shadow was gone (the theme removes every
`.modal-container` shadow with `!important`), and NcDialog's own 4px top and 12px start padding put the content 36px
in.

## What changes

The board dialog hands its radius to the theme's dialog radius token (16px 16px 0 0 for the phone's bottom sheet),
keeps its shadow with `!important`, and drops NcDialog's container padding, so the header and body insets are the
board's.
