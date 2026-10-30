# Proposal: board-task-table-meta

## Why

DqZaakTaken r36: the task table rows were 79.4 where the board draws 82 (and 94 vs 97 for a two-line meta). The board sets a task's meta line at 13px on the normal line, 2px under its name; live drew 12px at 1.2 right under the name.

## What changes

In the board look a task table's meta line under the name is 13px, line-height normal, 2px down. Probed on :8080 with the rule injected: rows 82 / 63 / 97 / 64 / 97 (board 82, 97, 97, 64 for its four rows).
