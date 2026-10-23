---
kind: code
---

# Proposal: row-mark-list

## Summary

Ruben, 11 Oct 2026: pages are manifest configuration over abstract widgets. learniq's roll call (RollCallView, 844
lines) gives every pupil of a group one of four marks, asks for minutes when late and a reason when absent with
permission, counts the marks, and saves the day in one request. decidiq's meeting attendance and quorum and humaniq's
presence list are the same shape. `toggle-table` is boolean only, so nothing in the library does this.

The `row-mark-list` widget (CnRowMarkList) reads the rows and the choices that scope them (a group, a day) from one
endpoint, lets every row take one of the configured marks by a tap or a key, shows per-mark details, and saves every
row in one request. Its keys are translated like its labels, so a language picks its own letters.

## Scope

New widget, docs, unit tests. No schema change.
