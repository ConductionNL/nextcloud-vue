# Proposal: conversation-source

## Why

Board DqZaak's Contact tab draws "Gesprek met de inwoner": the messages exchanged with the resident on the case, in
date order, each with its direction, channel (e-mail, Berichtenbox, phone note), sender, time and text, and a reply
field. The `conversation` widget drew a thread from a list field on the record and posted replies to an endpoint;
the messages here are objects of their own, filtered on the case, and sending is the app's business.

## What changes

- `conversation` reads its messages from `source` (a register list, token-resolved filter) as well as from a field.
- Mapping keys `bodyField`, `timestampField`, `senderField`, `directionField` + `outValue` (aliases of the existing
  keys) and the new `channelField` + `channelMap`; messages sorted oldest first.
- `replyAction`: an app action run on Send, with the text.
- CnConversationThread: a channel per message, a "Sent/Received message" label for a screen reader, a `loading` state.

Extends the existing widget rather than adding one. No schema change (the conversation content is not schema-constrained).
