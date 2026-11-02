# Proposal: board-action-tiles-as-drawn

## Why

PqWerkplekKlant (PL5-C pl8, PQ-T9 residue): the "Snelle acties" tiles are 104.5px high on live against the board's 97, and the label is 15px against 14. The tile keeps a 12px gap and the label inherits the board body's 15px at 1.5 leading; the board draws a 10px gap and a 14px label at normal leading.

## What changes

In the board look the action tile puts 10px between icon and label and draws the label at 14px on a normal line height. Nextcloud's default look is unchanged. Only pipelinq places `action-tiles`; dossiq has no action-tiles page. Probed on :8080 with compdiff `--inject-css`: PqWerkplekKlant "Nieuw verzoek" tile 104.5 -> 97 = board; DqDashboard (control) moves 0.0.
