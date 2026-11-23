# Proposal: audit-label-when

## Why

Board PqEvenement's history reads "Evenement aangemaakt in campagne Warmtenet Oost 2026". An event's campaign is
optional, and for an event without one the same label read "Evenement aangemaakt in campagne" with nothing after it.

## What changes

- An `actionLabels` value may be a list of `{ when?, text }`. The first entry whose local visibleWhen condition holds for
  the record gives the words; an entry without `when` always holds, so it is the fallback. Read by the timeline and the
  History card (`src/utils/auditLabels.js`), each text translated.

A string value works as before. No schema change.
