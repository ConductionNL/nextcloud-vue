# Proposal: board-dashboard-table-idle-chevron

## Why

COMPDIFF r33, DqDoorlooptijd "Prestaties per zaaktype": the board draws the table's heads as text and the table is 569px;
live reserved a 14px idle sort chevron and a 4px gap in every sortable head, so the table was 641px.

## What changes

In the board look, on a dashboard card, an unsorted column's chevron is taken out of the column's width and shown only on
hover or keyboard focus. A sorted column keeps its chevron. Sorting is unchanged.
