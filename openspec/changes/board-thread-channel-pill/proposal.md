# A message's channel pill takes the board's soft ink

## Why

The board draws a message's channel pill (DqZaakContact "Telefoon") 20px tall
in the soft ink (#3d4047). Live drew it 22px in the muted grey (COMPDIFF r24
color 61,64,71>94,97,104, h 20>22). The board rule
`.cn-look-board .cn-conversation-thread__channel` ties in specificity with the
component's scoped `.cn-conversation-thread__channel[data-v-…]`, which loads
later and kept `--color-text-maxcontrast`.

## What changes

The board rule names the thread as well, so it outranks the scoped rule, and
draws the pill in `--cn-board-text-soft` at a 16px line height. The channel
icon the board draws is not part of this change.
