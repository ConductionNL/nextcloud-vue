# Proposal: board-settings-save-row

## Why

COMPDIFF r20 found a divider before the save row in four settings cards that the Dq boards draw without one:
DqBeheerinstellingen "Serviceaccount voor achtergrondtaken", "Zaak-e-mail: gedeelde mailbox" and "AI-ondersteunde
verwerking", and DqInstellingen "Kadaster (BRK) en WOZ instellen". The board look drew a hairline above every settings
section's save row (`.cn-settings-section__save`). The Dq boards draw 70 save rows without one; where Dq and other
boards differ, Dq wins.

## What changes

In the board look a settings section's save row keeps its place and spacing but loses the hairline above it. The
Nextcloud look is unchanged.
