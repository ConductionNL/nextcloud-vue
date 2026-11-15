# Proposal: record-list-icon-row-action

## Why

DqZaakBetrokkenen (r43) draws a Toegang card whose live link row ends with a 34px square outlined button holding only an icon, named "Link intrekken" for a screen reader. A record list's one row action always printed its label beside the icon, so the card could not be drawn as manifest config.

## What changes

`rowAction.iconOnly: true` on a button action with an `icon` draws the icon alone in a 34px square. The label becomes the button's `aria-label` and `title`. With the outlined variant in the board look it is the board's bordered square. Without an icon the label stays as text, so a button is never left unnamed. No schema change.
