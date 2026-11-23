# Proposal: retention-expected-outcome

## Why

Board DqZaakArchivering draws the Archivering card of an open case with the outcome its type expects: Waardering "Vernietigen", Bewaartermijn "5 jaar na het besluit", Selectielijstregel "11.1.2, Woo-verzoeken", Besloten door "Het zaaktype, bij het sluiten", plus the sections "Bewaren voor een procedure" and "Overdracht naar het e-Depot". CnRetentionWidget only said "Decided when it closes" for every fact until OpenRegister nominated the record.

## What changes

- `content.expected` reads the candidate rules (a case type's result types) and shows the outcome they agree on before the record closes, or "Depends on the result" when they disagree. A failed read keeps the plain facts.
- `content.legalHold: true` adds a section with the record's active legal holds from `@self._retention.legalHold`, or says none applies.
- `content.transfer: { keepValues }` adds a section saying whether the record goes to the e-Depot.
- `content.pendingNote` replaces the note under an open record's facts.
- Opt-in; without these keys the widget is unchanged. No manifest schema change (the content object is open).
