# Design: screens-data-mini-table-fits

- The cells already break long words (`overflow-wrap: anywhere`); with `white-space: normal` the table's minimum width
  falls to what fits, so the auto table layout shares the value cell's width.
