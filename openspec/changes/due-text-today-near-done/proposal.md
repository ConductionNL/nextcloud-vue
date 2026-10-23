---
kind: code
---

# Proposal: due-text-today-near-done

## Summary

Board DqTaken's Deadline column reads "2 dagen te laat" and "Vandaag" in red, "Morgen" and "Vrijdag 9 okt" in
orange, "14 okt" plain, and a finished task's deadline as "Klaar op 6 okt" in grey. The due text could draw overdue
red and a soon date orange, but today was plain, a coming day was "morgen" or "9 okt", and a row whose deadline no
longer counts (`activeWhen`) read only its date.

Three opt-in `due` options:

- `todayTone: "danger"`: today reads in the overdue tone.
- `nearWithin` (days), with optional `tomorrowLabel`: tomorrow reads "Morgen", a later day within that many days its
  weekday and date ("Vrijdag 9 okt").
- `inactiveLabel` ("Done on {date}"): a row where `activeWhen` does not hold reads that text, in a new `muted` tone
  drawn in the secondary text colour.

Without these options the text and tones are unchanged.

## Scope

- `src/utils/dueText.js`, `src/components/CnCellRenderer/CnCellRenderer.vue` (`muted` class).
- No schema change (`widgetProps` is open).
