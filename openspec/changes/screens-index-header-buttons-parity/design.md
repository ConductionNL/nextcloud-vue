# Design: screens-index-header-buttons-parity

## The plus

`resolvedHeaderButtons` already defaults the `export` button's label and icon
under the board look ("Download", `Download`). The `add` button takes `Plus`
the same way, only when the manifest names no icon, so a page that draws
another icon keeps it. Every board's primary "New ..." header button draws a
plus (PqTickets, PqLeads, DqZaken).

## The buttons under a theme

The nldesign theme's `theme.css` sets on `.button-vue--secondary` and
`.button-vue--primary` the background, colour and border colour, padding
`8px 16px` and the radius, all `!important`. An author `!important`
declaration with a higher specificity wins, so the index header's direct
button children take the board values with `!important`:

- secondary (`> .button-vue--secondary`, and the Actions menu trigger
  `> .action-item .button-vue`): 40px high, padding 0 14px, 1px
  `--color-border-dark` border, radius 8px, `--color-main-background`,
  `--color-main-text`;
- primary (`> .button-vue--primary`): 40px high, padding 0 16px, no border,
  radius 8px, `--color-primary-element` with its text colour.

The buildiq square is a `.cn-buildiq-edit` wrapper, not a direct button
child, so its own rule is untouched. The rules live in look-board-index.css,
scoped to the index page, so the detail and dashboard headers are not
changed by this change.
