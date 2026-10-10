# Design: screens-table-rows-parity

## Row title

The boards split by app, not by page: Pq and Oc boards draw a plain title
(`<a style="text-decoration: none"><strong style="font-size: 15px">`, so
15px weight 700 from `strong`, with a `<span style="font-size: 13px">` muted
line 2px under it), the Dq, Bq, Dc, Hm, Hu, Lq, Lr, Pl, Pt, Sh, Sk and Tq
boards an underlined one (a 15px weight 600 link, the secondary line in the
cell's 14px). A page-level key fits that: an app sets it on its index pages,
like `headerButtons`, and the default keeps the look every other app has
today.

`rowTitle: "plain"` adds `cn-table-container--title-plain` to the board
table's container. The CSS under it drops the underline, sets weight 700 and
gives the secondary line 13px and a 2px top margin. The row stays clickable
through the stretched row link CnDataTable already draws; nothing in the DOM
changes.

### The underline on the secondary line

The underline sits on the title cell (`td.cn-table-col--title`), so a
`#column-<key>` slot override is underlined too. CSS propagates a text
decoration to every in-flow descendant, and a descendant's own
`text-decoration: none` cannot remove it. The one box it does not reach is an
atomic inline (an inline block), so the secondary lines become
`display: inline-block; width: 100%`: still a line of their own, with the
ellipsis they had, and no underline.

## Row menu

The nldesign theme's `theme.css` sets on `.button-vue--secondary`:
background, colour and border colour, `padding: 8px 16px`,
`min-width: max-content` and `border-radius`, all `!important`. An author
`!important` declaration with a higher specificity wins, so the board's row
menu rule (`.cn-look-board .cn-row-actions--board .button-vue`, three classes
against one) takes `!important` on the box, the border, the colour and the
background. The hover keeps the grey border and takes the hover background.
