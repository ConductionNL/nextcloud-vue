# Proposal: count-text-per-view

## Why

The cases boards say a different thing under the title per view. The table (DqZaken) reads "8 van 48 lopende zaken in
uw teams · gesorteerd op termijn"; the board view (DqWerkbord) "8 van 48 lopende zaken in uw teams · bordweergave per
status"; the map (DqZakenKaart) drops the sort and adds the places, "8 van 48 lopende zaken in uw teams · 5 met een
adres op de kaart". An index page has one `countText`, so live says "gesorteerd op termijn" in every view, also on the
board, which is not sorted by deadline, and on the map before the place count.

## What changes

- CnIndexPage takes `countTextByView` (manifest `config.countTextByView`), `{ table?, cards?, list?, board?, map? }`,
  each a count line template as `countText`. The open view's own text is used, else `countText`.
- A scope, a query preset or a saved view that sets its own `countText` keeps it in every view: a query preset or a
  saved view that sets `countText` sets the page's `countTextByView` aside, and a scope's `countText` is used before it.

No schema change: the page config is open, and `countTextByView` is not a saved-view override key.
