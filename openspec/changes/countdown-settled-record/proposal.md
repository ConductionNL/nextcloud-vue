# Proposal: countdown-settled-record

## Summary

The countdown widget learns `settledField`: a property on the record that is truthy once the work is done. A settled record reads "Closed" (or a configured `settledLabel`) in no threshold colour, never "N days overdue".

## Why

Zuiddrecht live round 3 (14 Oct): a closed dossiq case showed "24 dagen te laat" in red. The deadline passed after the case was closed, so the count says nothing a handler can act on, and the red sends them after a case that needs nobody.

## What changes

- `CnCountdownWidget` reads `content.settledField` and `content.settledLabel`. `settledLabel` runs through the host's `cnTranslate`; the default "Closed" is a library string ("Afgesloten").
- Without `settledField` the widget behaves as before.
