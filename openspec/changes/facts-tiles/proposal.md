# Proposal: facts-tiles

## Why

Board PqJourney draws a journey's steps inside "Journeygegevens" as four tiles side by side: Trigger, Wachten,
Voorwaarde and Actie, each a small box with its label in small caps above the value. The facts widget reads these values
already, but only draws rows (label beside value) or columns (label above value, a hairline under each).

## What changes

- `layout: "tiles"` on facts: each fact is a bordered box on the near-white ground, the label in 12px small caps in the
  primary ink above the value, the boxes side by side and wrapping (at least 160px each).

Without the key the card renders as before. No schema change.
