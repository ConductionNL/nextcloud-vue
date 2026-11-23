# Design: abstract-facts-widget

## Shape

`content.fields[]` is an ordered list of entries. The kind of an entry is its
`as` (`row`, `title`, `line`, `pill`); an entry with a `label` and no `as` is a
row, one without both is a line. Consecutive rows are grouped into one `dl`
so the label column is as wide as the widest label of that group, which is
what the boards draw (`grid-template-columns: max-content 1fr; gap: 8px 16px`).

Values are read with `readPath` (dot-paths, `@self.updated` works) and
formatted by `format`: `text`, `date` (the board short date, `formatBoardDate`),
`date-long` (always with the year), `list` (array joined by ", ", each item read
at `itemPath`). An object value falls back to its `title`/`name`/`label`.
`map` turns a raw value into a translated label.

## Source

Omitted: the current object (`objectData`, passed by CnDetailWidgetHost).
`{ register, schema, id }`: one OpenRegister object; `id` resolves through the
shared filter tokens. `{ url }`: resolved by `resolveEndpointRequest`, so
tokens inside the url work and an unresolved token that empties a path
segment blocks the request. A blocked or unresolved source sends nothing and
shows the empty text. The read is refetched only when the resolved source
changes.

## Links

Routes and hrefs take `@source.<field>`; `@source.id` reads `id`, else
`@self.id`. A link or title route whose token does not resolve is dropped
rather than pointing at a literal token.

## Chrome

`facts` joins `CONTENT_ONLY_TYPES`: on a card surface CnDetailWidgetHost wraps
it in CnWidgetWrapper with the manifest title and icon, which the board look
already styles for the side column; in a tab panel it renders bare.

## Colours

Only Nextcloud variables: `--color-text-maxcontrast` for labels and meta
lines, `--color-main-text`, `--color-primary-element` for the link. The pill
is CnStatusBadge.
