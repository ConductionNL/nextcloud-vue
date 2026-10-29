# Proposal: filter-strip-option-values

## Why

pl4 on board PqWachtrij: the queue draws a channel strip under the kind lenses (Telefoon, Mijn Zuiddrecht, E-mail,
Balie, each with its count). pipelinq declares `filterStrip` on `channel`, but live drew nothing: the ticket's
`channel` is a free string without an enum, so the strip had no values. Its options cannot be single values either:
requests and complaints store `phone`, `web`, `portal`, contact moments `telefoon`, `balie`, so one channel on the board
is several stored values.

## What changes

- A `filterStrip` option takes `values: [...]` in place of `value`: one pill for several stored values. Its count and
  its filter cover all of them (the field filtered on the list of values), and it shows pressed when the field's
  filter is exactly that list.
- An option with `value` behaves as before.
