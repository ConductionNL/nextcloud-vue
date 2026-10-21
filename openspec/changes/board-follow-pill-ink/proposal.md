# Proposal: board-follow-pill-ink

## Why

The board draws the follow pill's label (DqZaak "Volgen") in the main text, #1b1c1d. Under thematiq it draws in the
zuiddrecht primary, #3669a5: the control is a tertiary NcButton, and thematiq's tertiary scope points
`--color-main-text` at `--nldesign-component-button-color` on the button itself, so the board rule's
`color: var(--color-main-text)` reads the theme's button ink. COMPDIFF r20: DqZaak pill "Volgen",
`color rgb(27, 28, 29)>rgb(54, 105, 165)`.

## What changes

The board look sets `--nldesign-component-button-color` to the main text on the `.cn-follow-toggle` wrapper, where the
page's main text still holds, so the theme's tertiary scope resolves to it.

## Scope

Board-only. Contrast: #1b1c1d on white, 17:1.
