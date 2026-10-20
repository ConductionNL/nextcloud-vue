# Proposal: pill-color-field

## Why

The boards tint a record's kind by the record it points at: a case's type pill is red for a Woo request, purple for an
objection and teal for a permit (DqZaak, DqBezwaar, DqAanbesteding, DqTeamwachtrij), and the menu draws each case type
with its own icon. A header pill with `resolve` showed the referenced record's label but stayed neutral, a badge cell
over a reference took one fixed variant, and a saved view in the My views menu always showed the filter icon. The
header field chips already read a colour off a referenced record (`colorField`); pills could not.

## What changes

- `resolve.colorField` and `resolve.iconField` on a detail header pill (`typePill`, `statusPill`): the pill takes the
  tone the referenced record's colour maps onto and shows its icon.
- `widgetProps.resolve: { colorField?, iconField?, register?, schema? }` on a `badge` column of an index page: the same
  for each cell, read in one batch per column for the rows on screen.
- `variantForColor` (shared with the header chips) maps the NL Design System hues registers store (`red`, `blue-light`,
  `teal`, ...) onto badge tones, a hue and its light tint alike.
- The reference resolver reads one field strictly (`{ strict: true }`): a colour or icon name never falls back to the
  title.
- A saved view's `icon` shows on its My views menu entry instead of the filter icon.

## Scope

Generic: any app with a reference to a record that carries a colour or an icon. Nothing changes for a pill or column
that declares neither field.
