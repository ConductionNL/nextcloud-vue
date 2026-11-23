# Proposal: board-retention-pending-note

## Why

DqZaakArchivering r36: the Bewaring card sat 7.4 low. In the archiving card above it, an open record's note sat 15px under the facts and 15px over the next title at 14px on a 21px line (714.4/62, board 709/59), and each section's rows sat 4px under their title where the board leaves 10.

## What changes

In the board look the open record's note sits 10px under its facts and leaves the space under it to the card's 10px gap, at 13px on 1.5 with 10px 14px padding; a section title has a 6px top margin and its rows sit 10px under it. Probed on :8080 with the rules injected: note 709.4/59 (board 709/59), titles 784.4/888.4, marks 842.9/946.9 (board 842/946), card 474.4 plus its border (board 476).
