# board-tabs-widget-border

## Why

On a case detail page in the board look the folder tabs drew their outline in `--color-border-dark`, a far darker line
than the widget cards right below them, so the strip and the card it opens onto read as two different objects. The
board (dossiq/DqZaak) draws the tabs with the same light hairline as the cards.

## What changes

- In the board look a folder tab, open or not, draws its outline in `--color-border`, the token the widget cards use.
- The Nextcloud look keeps `--color-border-dark`: there the stock `--color-border` equals the inactive tab's fill.
