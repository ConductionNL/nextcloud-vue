# The user settings dialog's close button is 44px and round

## Why

DqPersoonlijkeInstellingen draws the settings dialog's close button 44px and
round in the corner. Live drew NcButton's 34px with radius 8 (COMPDIFF r24).

## What changes

In the board dialog, the user settings dialog's close button takes a 44px
size and a 22px radius, with no padding. Checked on :8080 by injecting the
rule: 44 by 44, still absolute in the corner.
