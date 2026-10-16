# Proposal: board-column-capacity

## Why

dossiq retires its own WorkflowBoard for the library board (dossiq #3989). The old board showed a status's limit in
the column header ("3 / 4"), turned the count red when the status was full, and refused a move into a full status
before asking the server. The library board had no way to say a column has a limit, so moving dossiq over would
lose that.

## What changes

- `columnFields[].source.capacityField`: the referenced row's numeric field that holds the column's limit.
- The header reads "count / capacity" and is drawn full (error colour, the word "full" for a screen reader) when
  the count reaches the limit.
- A move into a full column is refused with "{column} is full: {count} of {capacity}." without asking the host, by
  drag, card menu and the Move to select alike. During a drag the full column fades; in the card menu it reads "full".
- A column merged from several rows (`mergeBy`) shows no limit, because each row has its own. A move into a row
  that is full is still refused, counted per row, before the handler or the PATCH runs.
- A lifecycle state with `capacity` gets the same header and refusal.
- Manifest schema 2.100.0.

A column without a limit reads and moves exactly as before. The server stays the authority; this spares the round trip.
