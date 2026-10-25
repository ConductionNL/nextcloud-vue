# A map card can put its count at the right of the title row

## Why
DqZaak and DqZaakMeer draw "Locaties" with "1 locatie" at the right end of the title row (14px, muted). The map widget
could only report the count as a subtitle under the title (`content.headerSubtitle`, map-widget-header-count), which
draws a second line the boards do not have.

## What changes
`content.headerNote` takes the same shape as `headerSubtitle` (`{ one, other }` or one string, with `{total}`). It
reports the count as the card header's note, which the host draws at the right of the title row. `headerSubtitle` is
unchanged. No schema change.
