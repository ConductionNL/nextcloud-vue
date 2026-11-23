# Proposal: record-list-pill-case-template

## Why

pl4 on board PqVerkoopoverzicht: "Recent gewonnen / verloren" draws each deal's amount as a pill, green for a won
deal and red for a lost one ("€ 12.500"). A record-list pill case can pick the tone by the row, but its label is a
fixed word, so the amount could only be a plain trailing text.

## What changes

- A `pill.cases` entry's `label` (and the pill's own fallback `label`) may carry template tokens that read the row,
  with the template formats (`{value|currency}`).
- A label that fills to nothing draws no pill. A label without tokens is translated as before.
