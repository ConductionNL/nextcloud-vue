# Proposal: board-list-rhythm

## Why

r31 strict verdicts: on the Dq list boards (DqZaken, DqWerkbord, DqZakenKaart, DqZakenSorteren) every block under the header stood 4 to 19px higher than drawn. The header ended at the count line (72px, the board 76: 8px under a count line at normal leading), the toolbar's second row stood 8px under the first (board 20), and the bulk band kept a 20px margin on top of the page's 20px gap. On DqZakenKaart the map card filled the viewport (map 672 at 1120, board 533), pushing the pager 120px down.

## What changes

In the board look: the index header ends 8px under its count line, which reads at its normal leading also under a theme; the toolbar rows stand 20px apart; the bulk band adds no margin in the index page; the map list page keeps the height of its content with a 533px map, 18px in, and its rows' number line and date at normal leading. Probed live by injection: DqZaken chips 189, search 248, band 308, table 406 (= board); DqWerkbord cards at 553/564/718/740 (= board); DqZakenKaart card 632, map 533, pager 891 (board 631.7, 532.7, 890.7). No schema change.
