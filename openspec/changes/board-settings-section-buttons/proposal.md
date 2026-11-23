# Proposal: board-settings-section-buttons

## Why

The boards draw a labelled button on an admin settings card 40px tall, a text-only one 16px in at both sides
(DqBeheerinstellingen "Opslaan", "Verbinding testen"; PtBeheerinstellingen "Adres opslaan", "Herkomst opslaan", "Alle
sessies van deze organisatie intrekken"). The look set 40px only on the card's own save row and version footer;
buttons an app puts on the card stayed NcButton's 34px, 12px in (COMPDIFF r21 and pq2 `h 40>34`, `paddingLeft 16>12`;
still so on :8080 with nc-vue 2.124).

## What changes

In the board look a labelled button on a settings card takes the 40px field height, and a text-only one 16px side
padding, its label without NcButton's own 4px inset, as the board dialog footer does.

## Scope

Board-only, `look-board.css`. Icon-and-label buttons keep the look's 14px padding.
