# Proposal: board-conversation-reply-box

## Why

DqZaakContact draws the reply box under a hairline, 16px below the last message: the label and hint, a two-line
field (10px 12px, 15px at line height 1.5, 67px tall), and one row with the "log as a contact moment" option at the
start and the buttons at the end, "Versturen" with its send icon. CnConversationThread drew the field 48px tall,
the option on its own line above the buttons and Send without an icon (COMPDIFF r24: field h 67 vs 48, Send icon
absent).

## What changes

- The option and the buttons share one row (option at the start, buttons at the end; it wraps when narrow). An error
  message sits above that row.
- Send carries the send icon.
- In the board look the reply box opens with a hairline and 16px, 10px between its parts, and the field is the
  board's two-line field.
