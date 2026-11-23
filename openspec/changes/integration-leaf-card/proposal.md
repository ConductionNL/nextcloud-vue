# integration-leaf-card

## Why

A mount-mode integration leaf (ADR-066) renders its own framework into a bare element, so the detail page draws no card
around it. Leaves that draw their own card (humaniq's hours) look finished; leaves that do not (planninq's projects on a
dossiq case) showed "0 Projecten", a sentence and two buttons on the bare page, with no title, no border and no designed
empty state. Each app drawing its own card also means each draws a different one.

## What changes

- A leaf descriptor may declare `chrome: "card"`. On a detail page's card surface (grid cell or side column) the host
  then draws the library card: the manifest title (else the descriptor label) and icon in the header.
- The host hands such a leaf an `onHeader(header)` mount prop. The leaf reports `count` (a badge beside the title),
  `actions` (the standard header buttons) and `empty` (`{ name, description }`, drawn as CnWidgetEmptyState), and
  renders only its rows.
- In a tab panel (`chrome="bare"`) nothing changes: the strip is the card.
- Leaves without the flag keep their current rendering.
