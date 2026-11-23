# Proposal: index-count-suffix-per-filter

## Why

A lens can change the order of a list as well as narrow it. The unassigned lens of a work queue sorts the oldest item
first, and its board reads "12 van 40 · langst wachtend eerst" under the title. An index page has one count line per
view, so the line cannot say what the selected lens does.

## What changes

- CnIndexPage takes `countSuffixByFilter` (manifest `config.countSuffixByFilter`), `{ <tab id or label>: text }`.
- A quick filter tab may carry its own `countSuffix`, which comes first.
- While a tab with a text is selected, the count line gets that text after a middle dot, through the host translate
  function. Without the key, or on a tab without a text, the line stays as it is.

No schema change: the page config is open.
