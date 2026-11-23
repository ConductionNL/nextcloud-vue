# Design: screens-active-filter-line-parity

## Why an explicit `activeLabel`

A quick filter's `filter` map is a query, not copy. Deriving a chip from it
reads badly (`expectedClose: lte @monthEnd`) and would also put dossiq's "All"
tab on the line, because that tab carries a non-empty filter
(`statusHiddenInLists: false, isDraft: false`). The board draws the line in
the user's words ("Pijplijn: Verkoop"), so the manifest gives those words and
the library never guesses. No `activeLabel`, no chip.

## Removing a quick-filter chip

Single mode: back to the default tab (`default: true`, else the first), unless
that tab is the one being removed or itself has an `activeLabel`; then no tab
is selected, so the base filter alone applies and the chip does not come back.
Multiple mode: the tab leaves the selection. Clear all does the same for every
quick-filter chip, then clears the facets as before.

## The badge

`CnActionsBar` already counts `activeFilterChips` when no explicit count is
passed, so a quick-filter chip counts on the Filter badge with no change to
the bar.

## Naming a value

Reference columns with `labelField` already resolve ids in one batched
request per schema (`useRefLabels`). The Active line reuses that resolver: any
active filter key whose schema property is a `$ref` and that no reference
column covers gets a spec (label field empty, so `title`, `name`,
`@self.name` are tried), and the ids in the active filters join the batch.
Labels land in the same `refLabels` map. Order of preference: resolved
reference, facet bucket `label`, schema `oneOf` `title` (translated), raw.

## Tokens

`@monthEnd` is day 0 of next month. `lte: '@monthEnd'` is right for a date
field. For a datetime field it would stop at midnight of the last day, so
`@nextMonthStart` exists for `lt`. Both join `SENTINEL_TOKEN_PATTERNS.filter`
and the schema's mirrored pattern (byte equality is tested).
