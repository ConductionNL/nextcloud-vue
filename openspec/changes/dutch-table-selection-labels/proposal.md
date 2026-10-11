---
kind: code
---

# Proposal: dutch-table-selection-labels

## Summary

On the review instance of 11 October 2026 (finding N-4), the checkbox labels
of a selectable `CnDataTable`, "Select all rows" and "Select row", reached a
Dutch screen reader user in English. The library's Dutch catalogue had no
entry for them. Three more strings of the same component had none either: the
name of the scroll region ("Scrollable table" and "{title} — scrollable
table") and the "{count} selected" chip of a reference filter, a plural with no
plural entry in any catalogue.

## What changes

1. `l10n/nl.json` gains Dutch for "Select all rows", "Select row",
   "Scrollable table" and "{title} — scrollable table".
2. `l10n/en.json` and `l10n/nl.json` gain the plural entry "{count} selected",
   so `translatePlural` finds it.

No code changes.
