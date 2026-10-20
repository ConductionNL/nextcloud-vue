# Proposal: board-ink-without-forcing

## Why

thematiq forced the body ink onto every span, div and li with `!important`, so the board look named its ink through
`--nldesign-color-on-surface`, which that rule read. thematiq now sets the body ink on `body` alone and lets it inherit
(thematiq `fix/body-ink-zero-specificity`). A board rule that only set the variable would then draw the inherited body
ink, and a toolbar tertiary button would show the theme's button colour instead of the board's neutral ink.

## What changes

- The stages-widget labels and dates and the next-step card items set their ink as `color`, next to the variable.
- The board toolbar hands the main text to `--nldesign-component-button-color`, the token a tertiary button reads, as
  it already does for the secondary button.
