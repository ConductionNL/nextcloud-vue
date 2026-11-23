# Design: screens-dashboard-phone

- 640px, not 768: a tablet in portrait keeps the grid; only a phone stacks.
- `layout: "list"` keeps the reading order of the authored grid. A widget that must grow when its content wraps (a
  chip bar) sets `sizeToContent: true` in the manifest layout.
- The segmented control's wrap and 44px segments are in its own stylesheet under the compact size, which only the board
  look draws; the plain control is unchanged.
- The 44px floor on KPI tiles and rows is a `min-height`: it can only grow what is smaller.
