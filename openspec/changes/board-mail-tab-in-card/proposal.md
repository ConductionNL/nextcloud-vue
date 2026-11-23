# A mail tab in a page card reads as the card

## Why

DqZaakEmail draws the E-mail card with its title at 17px/700 on the card's
20px 22px padding and 12px between the parts. Live, CnMailTab pads 12px inside
the card, gaps 16px and sets its heading at 16px (r26c: title inset 35 vs 23,
top 35 vs 21, gap below the title 75 vs 49).

## What changes

- Board look, CnMailTab inside a CnDetailWidgetHost card: padding 0, gap 12px,
  heading 17px/700/1.2, description 14px. Sidebar and Nextcloud look unchanged.
