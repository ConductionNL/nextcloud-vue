# Proposal: board-tabs-theme

## Why

The boards draw a folder tab at regular weight with its top corners rounded, the open tab bold, every tab 37px tall
(DqZaak "Zaakonderdelen"; COMPDIFF F007 and F015, 34 and 25 boards). Under the nldesign theme, which sets every
button's weight and radius with `!important` through its button tokens, every live tab drew bold with four rounded
corners, and a tab without a count was 34px against 37px for one with a count.

## What changes

In the board look a folder tab sets the theme's weight token to 400 (700 on the open tab) and its radius token to
8px 8px 0 0, and stands 37px tall (the open tab 38px, 1px over the card's top border).
