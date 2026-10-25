# The assistant in the side column is the board's panel card

## Why

COMPDIFF r25e DqZaakAssistent (25 Oct): the Assistent card in the side column took the side cards' label title (15px/600 muted, no hairline, 20px 22px) and the side column hides every header action, so the Hermiq pill never showed. In the 300px column the input row put dictation, attach and the labelled send button beside the text box, which shrank to one letter ("V").

## What changes

- Board look: a side card holding the ai-chat widget is a panel: 17px/700 title over a hairline, 16px 18px in, its header items (the pill) shown, the content flush.
- A titled chat panel insets its body 16px 18px; its input is `stacked`: the text box and the send button share the first line, dictation and attach wrap under them.

## Impact

look-board-detail.css, CnAiChatPanel, CnAiInput (`stacked`, opt-in). No schema change.
