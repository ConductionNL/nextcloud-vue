# Proposal: board-menu-tab-icons

## Why

Board DqZaakMeer draws the case tabs that do not fit the strip at the top of
the Actions menu, each with its icon in front (Notities, Betrokkenen, E-mail,
Besluiten, ...). The board-look menu drew the label only, so those items stood
in a column of blank icon space beside the built-in items that do have one.

## What changes

A tab listed in the board-look Actions menu shows its icon (the tab's `icon`,
else its widget's) in front of the label. A tab without an icon is unchanged.
