# Design: screens-filter-menu-count

- The count is the number of active filter chips, the same number the sidebar toggle shows.
- NcActions has no slot beside its menu name. The page sets `--cn-filter-menu-count` (a CSS string) on the menu while
  the count is above zero, and the look draws it after the label with the badge's box. No property, no badge.
- The badge is decoration; the button's accessible name becomes "Filter, 2 active".
