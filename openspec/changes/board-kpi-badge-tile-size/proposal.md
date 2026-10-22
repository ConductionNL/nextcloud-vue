# The board KPI tile with its badge at the end is the board's larger tile

## Why

DqDashboard and DqMijnTeam draw their KPI tiles, whose icon sits in a circle at
the end, with:

- padding of 20px 22px
- 8px between the lines
- a 28px figure at the font's normal line height

That makes the tile 153px with a two-line caption. Live drew it at 18px 20px,
with a 6px gap and the theme's line height of 1, so the tile was 140px.

## What changes

- A board tile with `iconPlacement: "end"` (`cn-kpi-card__title--badge-end`)
  takes the 20px 22px padding, the 8px gap and the normal line height for its
  figure.
- The figure's line height needs `!important`, because a theme sets it through
  an id selector.
- Other board tiles keep their sizes.
- Checked on :8080 by injecting the rules: the tile with a two-line caption
  went from 140px to 153px; the others went from 127px to 140px.
