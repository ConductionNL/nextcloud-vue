# Proposal: conversation-endpoint-poll

## Why

pipelinq's website chat (`requests-web-chat-and-bot`) shows a live transcript on its ticket: the visitor, the assistant
and the colleague, with a reply box, re-read every few seconds while the chat is open. pipelinq drew it as its own
widget (`WebChatSection`), which the custom-widget ratchet (ADR-049, built-in first) refuses. The library's
`conversation` widget already draws a thread with a reply box, but reads its messages only from the record or from a
register list, and reads them once.

## What changes

- `source: { url, responsePath? }`: the messages come from an endpoint, the url filled from the record
  (`@objectId`, `@object.<path>`).
- `pollSeconds`: read the source again on that interval while the widget is shown; a failed poll keeps the last
  messages. `pollUntil: { path, in }` stops it once the answer says the thread ended.
- After a reply through `endpoint`, an endpoint source is read again.

A widget without these keys behaves as before.
