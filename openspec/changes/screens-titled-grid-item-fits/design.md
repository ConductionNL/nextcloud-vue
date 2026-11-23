# Design: screens-titled-grid-item-fits

- A grid item that holds a `.cn-detail-page__widget-title` becomes a flex column; the widget after the heading takes
  the remaining height (`flex: 1 1 0; min-height: 0; height: auto`), which also overrides a widget root that sets
  `height: 100%` on itself.
- The edit cog is absolutely positioned and is left out of the flex rule.
- `sizeToContent` items keep `height: auto` (GridStack measures them).
