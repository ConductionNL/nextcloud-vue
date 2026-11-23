# Proposal: board-record-card-text-leading

## Why

r31 with compdiff #543: DqAanMijToegewezen's six record cards read the meta line 13px under the title's text, the board 10. Probed on :8080: the title ran at line-height 1.3 (22.1px for 17px) and the meta line took the theme's paragraph leading (21px for 14px).

## What changes

In the board look the record card's title, meta line and note read at their normal leading, the meta line and note also through the theme's paragraph token. Probed live by injection: title text to meta text 10px on single- and two-line titles, as the boards draw. No schema change.
