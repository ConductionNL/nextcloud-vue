# Proposal: timeline-worded-history

## Why

Board PqEvenement's "Geschiedenis" reads "Joke van Dam staat op de wachtlijst", "Plaatsen verhoogd van 60 naar 80",
"Nieuwsbrief oktober verstuurd met de uitnodiging" and "Evenement aangemaakt". The timeline widget words an audit entry
as "Updated by System" and lists every read; its `limit` is not read; a related record's event carries a fixed label with
the record's title under it. The History card already has the words (`actionLabels`, `changeLabels`, `valueLabels`), in
code of its own.

## What changes

- The card's wording moves to `src/utils/auditLabels.js`, read by the card and the timeline. `{changed.<key>.old}` reads
  the old side of a change.
- The timeline takes `actionLabels`, `changeLabels`, `valueLabels`, `excludeActions`, `excludeActors` and `limit`.
- A `related` entry's `label` may name the row (`{path}` tokens, translated then filled) and `when` keeps only the rows a
  condition holds for.

Without the keys nothing changes. No schema change.
