# Proposal: board-follow-pill

## Why

The boards draw the follow control under a detail page's title as a 28px pill: 13px text at weight 600 on the main
background, a grey border, a 14px icon 6px from its label (DqZaak "Volgen"; COMPDIFF F012 to F014, 26 to 28 boards).
Live it was Nextcloud's 34px tertiary button with 15px bold text in the primary colour and a 4px start padding.

## What changes

In the board look the follow control's buttons on a detail page (the toggle and the follower count) draw the board's
pill. The nldesign button tokens carry its weight and radius past the theme's `!important` rules.
