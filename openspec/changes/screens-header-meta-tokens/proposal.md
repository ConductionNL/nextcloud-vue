---
kind: code
---

# Proposal: screens-header-meta-tokens

## Summary

The detail header meta line of boards PqAfspraak, PqKassabon ("€ 96,41 · Sanne de Vries · 7 oktober 11:43"),
PqKassadienst ("Joris Bakker · 09:00 tot 16:45") and PqZRapport ("Balie 1 · 6 oktober 2026 · 29 transacties") needs a
user's display name, a written-out month and enum labels, and must survive one empty value. `fillTemplate` gains
`longdate` and `user`; `resolveHeaderMeta` reads enum labels from the schema and drops an empty token with its
separator (the rule a table column's secondary line already follows, now one shared function).

## Scope

fillTemplate (formats, `joinTemplateParts` moved here from CnDataTable), a reactive user-name cache over
`resolveNextcloudUser`, headerMeta.js, one line in CnDetailPage. Stacked on #1694 (weekday and time formats).
No schema change.
