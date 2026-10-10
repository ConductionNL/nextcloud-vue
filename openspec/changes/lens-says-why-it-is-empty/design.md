# Design: lens-says-why-it-is-empty

Read on nextcloud-vue development `41e0cce1f` and openregister PR #4514
(`feature/read-history-on-audit-trail`, draft) on 9 October 2026:
`SearchQueryHandler::applyRecentLens()` writes `_recentLens`
(`{available, reason}`) and `ObjectsController` copies it to
`$responseData['@self']['lenses']['recent']` only when the lens was asked.
Reasons are the constants on `ReadHistoryService`:
`audit-trail-disabled`, `anonymous`, `read-history-unavailable`.

## D1. The report travels with the page it describes

The store writes `lenses[type]` in the same step as `collections[type]`, and
writes `{}` when the body has no `@self.lenses`. So the report always belongs
to the rows on screen: switching from the Recent tab to All clears it,
because the All response carries no report. A failed fetch leaves the
previous value, but the page then shows its error state, not the empty state.

## D2. Which lens the message is about

The response only reports lenses that were asked, so the components do not
need to know which quick filter is active. The first report with
`available === false` and a known text decides. Reports with
`available: true` or without a text are skipped.

## D3. Copy: built in for `recent`, overridable, generic otherwise

Built-in texts exist only for the `recent` lens, because only that lens
reports today. They are object-neutral ("items", not "zaken") since the
library does not know what the app lists. An app can say it in its own
words with `lensReasonTexts`, keyed `recent.audit-trail-disabled` (one lens)
or `audit-trail-disabled` (every lens); the specific key wins. An
`available: false` report with no text anywhere falls back to the page's
own empty text: the library does not invent an explanation it cannot back.

| Reason | English | Dutch |
|---|---|---|
| `audit-trail-disabled` | This server does not keep track of what you open. | Deze server houdt niet bij welke items je opent. |
| `anonymous` | Log in to see what you opened recently. | Log in om te zien wat je onlangs opende. |
| `read-history-unavailable` | Your recent items are not available right now. | Je recente items zijn nu niet beschikbaar. |

## D4. Where it shows

- `CnIndexPage`: the empty-state title (`CnEmptyContent :name`) takes the
  explanation in place of `emptyText`. The `#empty` slot still wins.
- `CnDataTable`: the default content of the empty row. Only its own
  self-fetch reports (a host passing `rows` passes no report).
- `CnWidgetObjectTable` forwards `lensReasonTexts` like every other data
  prop; the report itself comes from the inner table's fetch.

## Alternatives not taken

- An info icon or a second line under "No items found": Ruben asked for the
  explanation instead of the generic text, not next to it.
- Hiding the Recent tab when the lens is unavailable: the tab would vanish
  without saying why, and the report only arrives after asking.
