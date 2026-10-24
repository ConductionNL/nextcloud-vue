# The files bulk bar in the board look

## Why

DqDocumentenBeheer draws the band over the ticked files as the case list's
selection band: 10px 14px of padding, radius 10, the count in the band's
primary ink, and 34px buttons with their words only ("Samenvoegen tot pdf",
"Wie mag dit zien"). Live drew Nextcloud's 40px buttons with an icon each,
in an 8px 12px band.

## What changes

In the board look CnFilesBrowser's bulk bar takes the case list band's
measures: padding 10px 14px, radius 10px, 14px text at normal line height,
the count in `--color-primary-element-light-text`, buttons 34px high with
0 12px of padding, and the buttons' icons are not drawn. The Nextcloud look
is unchanged.
