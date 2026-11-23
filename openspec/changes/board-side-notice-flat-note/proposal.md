# Proposal: board-side-notice-flat-note

## Why

24l made the notice at the top of a detail page's side column one tinted block: only the outer layer paints, and the
banner and its note card inside stay flat. COMPDIFF r22, on nc-vue 2.124 with 24l live, still measured DqZaak's
"Advies gevraagd" as the inner card, 268px wide and 16px in, on all 12 case boards. NcNoteCard paints its ground with
`!important`, so the flat rule's plain `background: transparent` lost, and the note stayed a second, darker box inside
the notice.

## What changes

In the board look the note card inside a side notice clears its ground with `!important`. The Nextcloud look is
unchanged.
