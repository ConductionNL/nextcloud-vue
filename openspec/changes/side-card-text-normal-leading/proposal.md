# Proposal: side-card-text-normal-leading

## Why

r34: on the six DqZaak tab boards every side card under Termijn stood lower than the board (Behandeling +6, Gekoppeld +6, Werkinstructie +12.8, Status +21.6). The side cards' texts took Nextcloud's 1.5 leading: the Termijn date line 19.1 for 12.75px, the Werkinstructie source line 19.5 for 13px, the Status explanation 22.5 for 15px. The board draws them at the font's normal line height.

## What changes

In the board look the texts of a detail page's side cards read at normal leading: the countdown's sub line, a facts link and its note, the linked widget's empty line, the status explanation and its dwell line, and the attention flag's heading and hint. Probed on :8080 by injection: Termijn 188 and Werkinstructie 144, as the board. No schema change.
