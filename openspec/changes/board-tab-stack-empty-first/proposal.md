# Proposal: board-tab-stack-empty-first

## Why

COMPDIFF r24 on DqZaakEmail: the case's E-mail tab is a stack of widgets whose first widget renders nothing on this case.
Its slot still took a place in the stack, so the first card that does render stood 20px under the tab strip with all
four corners round, where the boards join the first card of a tab panel to the open tab (its top-left corner square).

## What changes

In the board look, a tab stack's first slot whose widget renders nothing takes no room, and the next card joins the open
tab as the first card does. The Nextcloud look is unchanged.
