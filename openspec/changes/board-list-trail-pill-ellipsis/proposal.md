# Proposal: board-list-trail-pill-ellipsis

## Why

On :8080 (24 Oct) the team queue's list row drew the case type pill "Kenteken wijzigen parkeervergunning" 243px wide in
a 200px trailing cell, running over "nog 1 dag" in the next cell (DqTeamwachtrij).

## What changes

In the board look a pill in a list row's trailing cell keeps to the cell's width and ends in an ellipsis; the text stays
in the page for assistive technology. Probed live by injection: the pill is 200px with an ellipsis, the deadline reads
clear. No schema change.
