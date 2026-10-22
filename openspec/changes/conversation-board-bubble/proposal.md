# Proposal: conversation-board-bubble

## Why

DqZaakContact names who wrote each message (the requester on an incoming one, the handler who logged an outgoing one),
says "Inkomend · 3 okt, 14:10", puts the channel in a small pill after the name, has a muted note under some messages
and a line under the card title. The thread had one author field, which a contact moment does not fill for the
resident, and kept the direction for screen readers only.

## What changes

- Widget: `usAuthorField` / `themAuthorField` per side, a field written `@object.<path>` reading the bound record;
  `usAuthorFormat` / `themAuthorFormat: user` shows a user id by its display name; `noteField`; `subtitle`;
  `showDirection`.
- Thread: `subtitle`, `showDirection`, a message `note`; the channel moves after the author.
- Board look: our messages in the main ink, the channel as a bordered pill, the meta line at 13px.

## Scope

Additive: every key is opt in. The channel's place in the meta line moves for every thread.
