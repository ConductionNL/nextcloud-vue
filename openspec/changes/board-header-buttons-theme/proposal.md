# Proposal: board-header-buttons-theme

## Why

The boards draw a page's header buttons at weight 600, a secondary button on the main background with a grey border
and the main text (DqMijnWerk, DqZaak, DqZaken). Under the nldesign theme, which paints every primary and secondary
button with `!important` through its button tokens, the live buttons drew at 700, and a dashboard header's secondary
button ("Nieuwe zaak" on dossiq's Mijn werk) drew in the primary colour with a primary border on no ground. The index
header kept its ground only through a block of `!important` rules of its own.

## What changes

In the board look, every header button container (index, detail, dashboard, settings, admin settings) and
CnActionButtons set the nldesign button tokens to the board's values: weight 600 for every button and for primary
buttons, and the secondary's ink, ground, border and hover ground. The theme's own rules then draw the board's
button.
