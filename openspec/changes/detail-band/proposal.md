# detail-band

## Why

Some detail boards draw a row of cards across the whole page, above both the body and the side column: PtPortal puts
the portal's four traffic figures and the start-page notice there, above the tabs and the side cards. CnDetailPage had
no place for that: `before-body` sits inside the body column, so anything placed there is as narrow as the body and the
side column starts beside it.

## What changes

- A detail page takes a band (manifest `config.band`): a row of widgets across the full width of the page, between the
  header and the body and side column.
- An entry is the id of a widget declared in `widgets`, a widget definition, or `{ widgetId, span }`. `span` is the
  share of the row in twelfths (default 12); entries wrap to the next line when the row is full or the page is narrow.
- Each entry follows its `visibleWhen`, as a side column card does. `chrome` (`card` or `bare`) picks the frame; a
  banner defaults to bare, every other widget to a card, so a widget that draws its own card (a KPI) asks for bare.
- Generic: any app's detail page can use it (a dossiq case could put its stage strip or KPIs there).
