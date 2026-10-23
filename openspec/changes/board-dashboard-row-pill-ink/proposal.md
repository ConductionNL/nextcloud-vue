# Proposal: board-dashboard-row-pill-ink

## Why

DqProcesanalyse "Waar zaken blijven hangen" draws "Knelpunt" in red ink and "Let op" in amber ink on their tinted grounds.
Live, both read in the main text (27, 28, 29), with the right grounds. Measured on :8080: the board look gives a dashboard
record-list row and every descendant `color: inherit`, so a status pill inside the row inherits the row's ink instead of
its tone's (`--cn-status-badge-ink`, #A30000 on Zuiddrecht).

## What changes

The inherited ink skips a status pill, anything inside one, and the row's due text, which carry their own tones. The row
link and its title and meta lines keep the row's ink.

## Scope

nextcloud-vue look-board CSS only.
