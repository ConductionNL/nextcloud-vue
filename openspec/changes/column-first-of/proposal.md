# Proposal: column-first-of

## Why

Board PqOfferte's "Regels" names each line in the Product column. A line now has a name of its own (pipelinq
salesQuoteLine 1.1.0), but older lines have none, and their Product cell would read as a dash although the line has a
linked product or a description.

## What changes

- A table column takes `firstOf`: a list of fields (dotted paths allowed), and the cell shows the first that holds a value.
  The object list passes it through, together with `secondaryLabels` (the words for a value on the second line), which it
  dropped before.

Without the key nothing changes. No schema change.
