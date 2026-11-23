# Proposal: formatter-column-takes-enum-labels

## Why

pl6 on :8080, PqProject "Taken in deze cyclus" and "Cycli": the status pills printed the stored codes ("inProgress",
"closed", "open") where the board draws "In behandeling", "Klaar", "Niet gestart". The columns draw a badge through
pipelinq's `enumLabel` formatter, which reads the labels from the cell's property. CnObjectListWidget hands a column
the schema's enum and `x-enum-labels` only when it names no widget or formatter, and CnDataTable gets no schema here,
so the formatter had no labels and printed the code. pipelinq uses `formatter: "enumLabel"` on about 30 list columns.

## What changes

- A list column with a `formatter` and no enum of its own takes the schema property's `enum` and its labels, so a
  formatter that reads them finds them. The formatter still draws the cell; a column without a formatter is unchanged.

## Reach

CnObjectListWidget.resolvedColumns only.
