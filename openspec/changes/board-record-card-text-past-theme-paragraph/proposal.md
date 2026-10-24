# Proposal: board-record-card-text-past-theme-paragraph

## Why

On :8080 (24 Oct) the record card's meta line ("Woo-verzoek · Linda Bakker") and its cover note ("Voor Esra Demir, tot
30 okt") were drawn at 15px in the main ink, where DqAanMijToegewezen and DqZakenSorteren draw 14px muted and 13px
semibold purple. The theme sets every paragraph with `!important` through its paragraph tokens, so the board-look rules
never applied.

## What changes

The record card's meta line, note (with its purple and teal tones) and description hand the theme their own size, weight
and ink through `--nldesign-component-paragraph-*`, as other board paragraphs already do. Probed live by injection:
meta 14px rgb(94,97,104), note 13px/600 rgb(74,63,143). No schema change.
