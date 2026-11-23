# Proposal: data-table-column-align

## Why

pl4 on boards PqKassabon (Regels), PqKassadienst (Afstortingen) and others: the board draws amounts, counts and
percentages at the end of their column. The manifests already say so with `align: "right"`, CnObjectListWidget passes
`align` through, and the docs list it, but CnDataTable never read it, so every such column sat at the start.

## What changes

CnDataTable gives a column whose `align` is `right` or `end` the existing `cn-table-col--end` class on its header and
its cells. Columns without `align`, or with `left`, are unchanged.
