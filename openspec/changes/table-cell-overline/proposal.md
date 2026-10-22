# table-cell-overline

## Why

PtToegangsverzoeken draws its "Gevraagde toegang" cell on two lines: a muted "Zaken van" above the organisation the
access is for. A column could carry a muted line under its value (`secondary`), not above it.

## What changes

- A table column takes `overline`, with the same grammar as `secondary` (a field key, a `{field}` template, or a
  function of the row), or `overlineText`, a fixed text: a muted line drawn above the value. `secondary` and
  `overline` share one implementation.
