# Proposal: quick-filters-from-active-scope

## Why

DqTeamwachtrij (r31 strict, re-probed 26 Oct): the team queue lists 3 unassigned Woo cases, yet its type chips read "Alle typen 18 / Omgevingsvergunning 5 / Omgevingsvergunning kleine bouwactiviteit 3 / Woo-verzoek 3 / ..." (r31: "Omgevingsvergunning 0" lit, Woo-verzoek behind the overflow). The `quickFiltersFrom` values were grouped under the page filter only, while the queue's own filters (unassigned, open, the team) come from its saved view as active filters. The board draws one chip per type in the queue, most frequent first.

## What changes

The generated tabs are grouped within the page filter and the active filters, leaving out the field's own filter so a picked tab keeps the others. The queue then shows "Alle typen 3 / Woo-verzoek 3". No schema change.
