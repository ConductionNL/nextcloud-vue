# Design: screens-record-list-avatar

- The avatar is a template, like `title` and `meta`, so any field path or extended relation works. A row with no name
  draws no circle.
- Initials follow the library's avatar cell: first and last word. The boards' sample "MD" for "M. de Graaf" is a
  hand-drawn sample; the library keeps one rule across cells.
- The second line needs no new key: `meta` plus `extend`. The docs show it.
- The circle is `aria-hidden`: the name is read from the meta text.
