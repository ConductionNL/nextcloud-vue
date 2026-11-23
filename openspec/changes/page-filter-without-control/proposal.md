# Proposal: page-filter-without-control

## Why

DqDoorlooptijd names the period it reports on, "Januari tot en met september 2026 ·", but offers no control to change
it: the period is fixed for the page. A dashboard description reads a period only from a page filter
(`{filter.<key>}`), and every page filter drew a control.

## What changes

A page filter with `control: "none"` seeds its `default` into the workspace like any page filter, so widgets read it
(`@workspace.<key>`) and the description names it (`{filter.<key>}`), but it draws no control anywhere.

## Scope

CnDashboardPage page filters. Schema: `control` gains `none` where the schema lists the controls.
