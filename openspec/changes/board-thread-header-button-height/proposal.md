# A conversation thread's header button is 40px on the board

## Why

The board draws the contact thread's labelled header action ("Contact
vastleggen" on DqZaakContact) at the 40px control height, as it draws the
history's "Exporteren" and a detail card's header buttons. CnConversationThread
puts it in `.cn-conversation-thread__header-actions`, which no board rule
reached, so NcButton drew 34px (COMPDIFF r24 h 40>34; probed on :8080).

## What changes

In the board look a labelled button in the thread header takes
`--button-size: var(--cn-board-control-height)`. Menu triggers and icon-only
buttons keep their size. The default look is unchanged.
