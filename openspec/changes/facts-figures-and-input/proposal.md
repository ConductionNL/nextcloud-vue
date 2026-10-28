# Proposal: facts-figures-and-input

## Why

Board PqKassadienst draws a shift's cash difference as three figures (expected, counted, difference), a note under the
difference ("3,0%, buiten de marge") with the amount in red, a red band only when the difference is outside the margin,
and a "Reden van afwijzing" field that the reject button sends. The facts widget drew rows or small-caps tiles, always
showed its notice, and had no field. Its source also skipped a read whose sort named "@self.created", reading it as an
unfilled token, so the pipelinq shift page said "not counted yet" beside a counted shift.

## What changes

- `tileStyle: "figures"` with `layout: "tiles"`: white tiles, a plain label above a large value.
- A row's `note` (parts under the value) and `tone` (a variant by condition) on its value.
- `notice.visibleWhen`: the band shows only while the record meets the condition.
- `input`: one labelled text field; actions read it as `@input.<key>`.
- A row's `pill` (`{ variantMap }`): the value as a status pill.
- A source's `sort` is not checked for unfilled tokens.

Without the new keys nothing changes. No schema change.
