# Proposal: board-dashboard-widget-inset

## Why

A dashboard card's body is flush, so each widget has to carry the card's side inset. The record list, saved views and
card grid do (24px). Others did not, and on the boards' dashboards they started on the card's edge: the task list's
checkboxes ("Mijn taken", 1px in against the board's 25px), the step bar and its legend ("Mijn 14 zaken per stap"),
the week strip, the bar list ("Zaken per status") and the activity items 17px in against 25px. A widget table's first
column sat 17px in against the board's 23px. The step bar and week strip had an opt-in inset (`content.inset`) that no
dossiq widget set.

On a detail page a stat tile in a side card (DqZaak "Termijn") sat 11px from the card's edge against the board's 23px:
the wrapper's flush rule loads after the look's stylesheet and outranked the side card's padding.

## What changes

In the board look, on a bordered dashboard card, the task list, step bar, week strip, bar list or matrix, activity
items and a widget table's outer columns sit on `--cn-board-dashboard-card-inset` (24px). A stat tile in a detail side
card sits on the side card's inset (10px 22px 20px), with no padding of its own.
