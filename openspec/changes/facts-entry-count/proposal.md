# Proposal: facts-entry-count

## Why

Board DqZaaktype's Gegevens card ends in "Lopende zaken 43": how many running cases use this case type. A facts entry
reads a path of a record; it could not count the records of another list that point at this one.

## What changes

A facts entry takes `countFrom: { register, schema, filter? }` (filter tokens resolved against the record) and shows
the list endpoint's total for it. Each list is counted once per card. A count that cannot be read leaves the row out;
a zero shows.

## Reach

Opt in per entry. No schema change (the facts content is not schema-checked); docs in `cn-facts-widget.md`.
