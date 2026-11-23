# Proposal: features-board-read-more-ink

## Why

pl4 on PqRoadmap measured every feature card's "Lees meer" button in the theme's link blue (54, 105, 165), where the
board draws it in the main ink (27, 28, 29): 36 of the board's 71 failing items. The component already sets
`color: var(--color-main-text)`, but the nldesign theme paints every `<a>` that is not a button with its link colour
through `!important`, and this button is an `<a>`.

## What changes

- The "Learn more" button hands the theme's link tokens (colour, hover, visited, underline) the main ink and no
  underline, the way the board look already does for a link drawn as a button.
