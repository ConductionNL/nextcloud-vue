# A note in a page card starts at the card's inset

## Why

DqZaakEmail draws each note with its 32px tile at the card's 22px inset and the text 12px after it (text at 67). Live, NcListItem pads 4px + 4px around the row and 8px before the text: icon at 31, text at 71, and the row 8px lower (r29 Notities first row 31 vs 67, 54.8 vs 41 under the title; read on :8080).

## What changes

- Board look, notes tab in a page card: the note's list-item wrapper and item have no padding; the content starts 12px after the icon.
- Its name and subname run on the normal line height and its icon sits at the top of the item (probed on :8080: name 44.8 under the title as drawn, icon 44.8 instead of 51.3).
