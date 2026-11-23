# Design: screens-date-tile-cell

- Box values from the board: tile `flex 0 0 46px`, padding 5px 0, radius 8px, `--color-background-dark`; day 17px
  bold with line-height 1; month 12px `--color-text-maxcontrast`; 12px gap to a column of two lines with a 2px gap;
  weekday weight 600; time `--color-text-maxcontrast`.
- Day, short month and long weekday are `Intl.DateTimeFormat` in `boardDateLocale()`. A trailing dot on the month is
  dropped ("okt." becomes "okt", as the board draws it).
- Time: `formatTimeOfDay(start)`, and with a parsable `endField` on the row,
  `t('{start} to {end}')`. A date-only value (format `date` or `YYYY-MM-DD`) draws no time line.
- The whole block is a `<time datetime>` with the long date as title. Without `layout: "block"` the date cell is
  unchanged.
