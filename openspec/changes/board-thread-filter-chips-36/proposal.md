# A record card's channel chips are 36px on the board

## Why

Inside a record card the boards draw a chip row at 36px, radius 18, 12px in:
the contact thread's channel chips (DqZaakContact "Telefoon", "E-mail") and the
history's chips (DqZaakHistorie, CnTimelineManage, already 36). The board look
draws every CnQuickFilterBar chip at the index pages' 38px, 14px in, so the
thread's chips came out 38 (COMPDIFF r24 h 36>38, paddingLeft 12>14; probed on
:8080: `.cn-quick-filter-bar__tab` in `.cn-conversation-thread`).

## What changes

In the board look a CnQuickFilterBar chip inside a CnConversationThread is 36px
tall, radius 18, 12px in. Index-page chip bars keep 38px. The default look is
unchanged.
