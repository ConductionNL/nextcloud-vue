# A file's side card facts read left to right

## Why

On DqDocumentenBeheer the cards about the ticked file ("Wie mag dit zien",
"Controlegetal", "Documentgegevens") showed their labels right-aligned with a
wide gap and padding around every value: Nextcloud core's apps.css draws every
`dt`/`dd` inline-block with a fixed, end-aligned `dt`. The board draws the
labels left-aligned in their column, the values beside them.

## What changes

CnFilesBrowser's side facts set their `dt` and `dd` as plain blocks: no fixed
width, start-aligned, no padding, wrapping normally. Both looks.
