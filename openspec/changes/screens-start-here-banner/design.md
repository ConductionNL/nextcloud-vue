# Design: screens-start-here-banner

- One request. The page evaluates the card's `visibleWhen` once (it needs the verdict to collapse the cell) and now keeps
  the first row in the outcome (`outcome.row`); the card renders from that. A card used outside a dashboard evaluates
  itself and keeps the row the same way. `readVisibleWhenValue` takes an optional third argument, a sink object that
  receives `row`; callers that do not pass it are unchanged.
- No row, no card: `notEmpty` on `id` fails, the cell collapses, as for any other `visibleWhen`.
- A subject token with no value empties its whole text (as in a record list), so a missing customer name leaves no
  "has waited" fragment.
- `{value}` still works next to subject tokens.
- The failure line ("Could not check") never shows a title that holds a template.
- `@subject.` is resolved in an action's `route` object (params, query), not in `href`.
