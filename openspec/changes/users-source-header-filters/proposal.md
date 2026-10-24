---
kind: code
---

# Proposal: users-source-header-filters

## Summary

DqAfdelingen draws a filter funnel on every head of the staff table (Medewerker, Rollen, E-mail, Vandaag). The `users` source now asks for them (`headerFilters: true`) and declares the arguments they send: name, roles and e-mail as "contains" text (`nameLike` also matches the function line), Vandaag as the values picked. The members a group has are read once (users-source-pages); the filters narrow them in the source, with no new request.

Stacked on users-source-pages; merge after it.

## Scope

- `src/composables/indexSources.js`, `tests/composables/indexSourcesUsers.spec.js`. No schema change.
