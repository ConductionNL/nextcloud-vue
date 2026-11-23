# Proposal: text-widget-monospace

## Why

Boards PqKassaAfrekenen and PqKassabon show a receipt as a column of plain text whose spaces line the amounts up. pipelinq draws it with a local
`ReceiptPreviewPane`. `CnTextWidget` parses its text as HTML or markdown, which collapses the spaces, and it reads only a fixed `text`.

## What changes

- `content.monospace` on `CnTextWidget`: the text shows as typed, in a fixed-width font, never parsed.
- `content.textField` with the new prop `objectData`: the text comes from that field of the detail page's object.
- Without these keys the widget behaves as before.

Item 7 of the fleet component gap list (decisions 281, 320).
