# A parties card can put its add button in the title row

## Why
DqZaakBetrokkenen draws "Rollen" with the accepted kinds strip straight under the title. Live drew the
"Betrokkene toevoegen" button as a row of its own above the strip: r34 measured the first row 593.9px in and 40.3px
under the title where the board has 23 and the strip. The add button is the only way to add a party from the party
model, so it stays; it moves to the card's title row, where the boards put a card's buttons.

## What changes
`content.manage.add.placement: "title"` reports the add button through the widget's `header` event, which the host
draws in the card's title row. Without it the button stays above the parties. No schema change.
