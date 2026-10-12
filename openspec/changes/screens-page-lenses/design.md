# Design: screens-page-lenses

- No new page-level control. The chips are a `workspace-filter` widget in the grid, so the manifest places, titles and
  hides them like any widget. A page that wants the board's bar gives the widget a full-width cell and
  `showTitle: false`.
- The chips are CnSegmentedControl `size: "compact"` in radio mode: arrow keys move the choice, Tab enters and leaves
  the group in one step, the group is named by `label`.
- A count is one list request (`_limit=1`, the `total`), as the tab counts are. `countFrom` as a list adds the totals;
  if any of them fails the option shows no count rather than a wrong one. Counts are read on mount and on
  `cn:page:refresh`.
- `urlKey` replaces the history entry and keeps the other query keys, as the page view switch does. An address value
  that names no option is ignored.
- WORKSPACE mode is answered synchronously from the reactive bag, so it never waits on the settle gate that
  endpoint/source conditions use, and it is left out of the async evaluation. It is a top-level condition; inside
  `all`/`any` it is not honoured on a dashboard (the async evaluator answers it, without the page bag).
- A widget that reads a key nobody wrote is hidden, so a lens page names its default (`default: "all"`), which the
  filter writes on load.
- KPI-row tiles are not grid items; the page drops a tile a workspace condition hides. Other conditions on a tile
  keep being ignored there, as before.
- Display only: the authored layout is never mutated, and edit mode shows every widget.
