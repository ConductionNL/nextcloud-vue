# record-list-row-rules

## Why

Learniq's "My evaluations" lists the caller's open invitations. An invitation on an in-app questionnaire is filled in
a dialog, and one on an external form opens that form's address. The record list's row actions were the same on
every row and could only run a page action or call an endpoint, so the page stayed custom code.

## What changes

- `rowActions[].visibleWhen`: a condition over the row; the action shows only on rows where it holds, and a row with
  no action left has no menu.
- `rowActions[]` with `href`: a link whose address is a template over the row. A web address opens in a new tab, an
  instance path in place, and any other address hides the action on that row.
