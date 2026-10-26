# Proposal: chart-week-categories

## Why

DqProcesanalyse and DqDoorlooptijd draw the throughput per week with the weeks named "w30", "w31". The endpoints key a
week as ISO `2026-W40`, and the chart wrote those keys out in full, rotated and crowded.

## What changes

`categoryFormat: "week"` writes an ISO week key (`2026-W40`) as "w40". A category that is not a week key is left as it
is.

## Scope

CnChartWidget, the library catalogue ("w{week}"). Schema 2.152.0: `categoryFormat` gains `week` (renumber in the fold).
