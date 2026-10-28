# Proposal: sections-gap

## Why

Board PqJourney draws the journey's facts and its steps in one card, the steps 14px under the facts. A sections widget
with `dividers: false` stacks its sections 8px apart, a size made for a row of banner strips.

## What changes

- `content.gap` on the sections widget: the space between plain sections in pixels. Without it the space stays 8px.

No schema change.
