# Proposal: board-sunken-ground

## Why

COMPDIFF r24: three blocks that the boards draw on the page's own ground (#f5f6f8, the content surface) were drawn on
Nextcloud's hover grey (#f0f1f3) live: the phase groups of DqZaaktype "Fasen en taken" (CnGroupedCardsWidget), the
device frames of DqInspectie (CnDeviceFramesWidget) and the other side's message bubbles of DqZaakContact
(CnConversationThread). Seven items on three boards carry that background delta.

## What changes

The board look gets a `--cn-board-sunken-ground` token, the content surface with the hover grey as fallback, and those
three blocks take it. The Nextcloud look is unchanged.
