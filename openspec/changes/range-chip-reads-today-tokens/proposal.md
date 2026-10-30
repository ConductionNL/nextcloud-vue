# Proposal: range-chip-reads-today-tokens

## Why

r38 (DqTaken, nc-vue 2.163.0) showed the Active line chip as "Deadline: @today-12d tot en met @today+8d": a range filter whose ends are `@today±Nd` tokens (the index resolves them for the query) was written out as the raw tokens. A person reads a token they cannot act on. `relativeRangeText` already reads the tokens, but only for entries marked `relative`, and `rangeChipText` read date strings only.

## What changes

`src/utils/filterRangeLabel.js`: `rangeChipText` reads an `@today` / `@today±Nd` end as the date it stands for, so the chip reads "18 oktober tot en met 7 november". No schema change.
