# A tab's stack can follow the order of a list on the record

## Why
A dossiq case type opts into generic Overview cards by naming them in `overviewCards`, but the Overview tab draws its
stack in the authored order only, so a case type cannot say which of its cards comes first.

## What changes
A `content.tabs[]` entry with `widgetIds` takes `orderFrom`, a dot-path into the record (`@context.<name>` included).
The widgets the list names take the places of the listed widgets in the list's order; the others keep their places.
No list, or an empty one, keeps the authored order. No schema change: widget content is not schema-validated.
