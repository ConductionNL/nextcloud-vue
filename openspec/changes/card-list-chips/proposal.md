# Proposal: card-list-chips

## Why

Board PqPipelines draws each pipeline as a card: its name, whether it is the default, its description, "6 fases" in the meta line and its stages as chips. A card's chips each read one field and its meta parts each read one field, so a list of stages and a counted line could not be drawn.

## What changes

- A chip may name a list field with `each`. The card then draws one pill per entry. `each` names the entry's field (`name`) or is a template filled from the entry (`'{name} {probability}%'`). Empty entries are left out.
- A meta part may be `{ template }`, a line filled from the object in the host's translation (`'{stages|count} stages'`).
- Schema 2.161.0 (renumber at merge).
