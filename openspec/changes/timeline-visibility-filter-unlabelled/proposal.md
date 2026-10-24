# Proposal: timeline-visibility-filter-unlabelled

## Why

Board DqZaakHistorie draws the history's visibility filter as a select reading
"Intern en openbaar" under the kind chips, without a label above it. The manage
timeline drew a visible "Zichtbaarheid" label.

## What changes

`visibilityLabel: false` keeps the filter's accessible name ("Visibility") but
draws no label, so the select reads its placeholder on its own. Default
unchanged.
