# A notes card carries its Add in the title row

## Why

DqZaakEmail draws the Notities card with "Notitie toevoegen" at the end of the title row and each note under a hairline (12px 0). Live, the notes tab's add button sits on its own row under the title and the threads have no rule (r26c: header.actions 1 vs 0, header.separator 1 vs 0). Probed on :8080 with the rules injected: the button lands 21px from the card top, level with the title, 23px from the right edge.

## What changes

- Board look, notes tab inside a page card (CnWidgetWrapper): the composer toggle is placed in the title row (absolute, top 20px, the card's inline padding from the right); the empty action row takes no margin; threads are 12px 0 with a hairline above, list gap 0. The add form, when open, stays in the body. Sidebar and Nextcloud look unchanged.
