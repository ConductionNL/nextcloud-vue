# Proposal: facts-entry-empty-value

## Summary

`emptyValue` on a facts entry names the text shown when the entry has no
value. The entry is then drawn whatever the card's `hideEmpty` says.

## Why

Board DqZaak draws the "Prioriteit" card with the row "Overschreven: Nee" on a
case whose priority nobody overrode. The override field is empty then, so the
row was either dropped (`hideEmpty`) or drawn with an empty value. An empty
field that has a meaning ("not overridden") needs its own words.
