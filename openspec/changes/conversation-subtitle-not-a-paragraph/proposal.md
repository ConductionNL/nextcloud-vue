# The conversation subtitle keeps its 14px under a paragraph theme

## Why

thematiq's theme sets every `p` to the paragraph token size and line height with !important, so CnConversationThread's subtitle (a `<p>`) read 15px/22.5 instead of 14px (DqZaakContact "Gesprek met de inwoner" r26c: content 48.9 under the title vs the board's 46.5; read on :8080, theme.css `p { font-size: ... !important }`).

## What changes

- The subtitle is a `<div>`, so its own 14px applies, at `line-height: normal`.
