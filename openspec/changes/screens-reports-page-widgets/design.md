# Design: screens-reports-page-widgets

- `widgets` (`config.widgets`) and `layout` (`config.layout`) arrive as props from CnPageRenderer, or from
  `page.config` for a host that hands over the whole page. Props win, as for the other keys.
- They render as `<CnDashboardPage :widgets :layout :showHeader="false">` after the card grid, in a wrapper with
  20px space above. CnDashboardPage is an async component, so a cards-only reports page does not load it.
- Without `layout`, each widget takes a full row (`gridWidth 12`, `gridHeight 4`) in the order declared.
- Widgets without an `id` are dropped. Without widgets, the page is unchanged.
