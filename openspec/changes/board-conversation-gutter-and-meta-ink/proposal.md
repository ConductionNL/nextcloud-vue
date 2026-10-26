# Proposal: board-conversation-gutter-and-meta-ink

## Why

DqZaakContact draws each message with 64px free on the side away from its avatar, so the two sides of a conversation
read as two columns, and the line above a message (author, channel, direction, time) at 13px in the soft ink at the
font's normal line height. COMPDIFF r25 measured every bubble 64px too wide (707.7 vs 643.7) and the line in the
main ink at 20.25px, our side's author in the primary tint's ink (35,74,120): the board rule for our bubble's ink tied
with the component's scoped rule and lost.

## What changes

In the board look a message keeps 64px free on the side away from its avatar; the meta line is 13px in
`--cn-board-text-soft` at line height normal, its time in the same ink; our bubble's text takes the main ink, named
through the thread so it outranks the scoped rule.
