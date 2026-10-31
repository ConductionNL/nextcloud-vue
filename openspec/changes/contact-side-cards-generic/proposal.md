## Why

The person and organisation pages of pipelinq, dossiq and shillinq share one frame (design `screens-relation-pages`). Two of its side cards, "Contactkanalen" and "Relaties" (boards PqKlant and PqOrganisatie), were still app components in pipelinq (`ContactChannelsCard`, `ContactRelationshipsCard`), so no other app could place them and gate 52 counted two more custom widgets. Pages are manifest config over generic widgets, so the cards move into the library as configuration.

## What changes

- `field-list` gets `variant: "pairs"`: a label beside a value per entry (`row.label` as parts, "E-mail, privé"), edit and remove in a "..." menu, and `emptyLabel` for an empty list ("Sociaal  Nog geen").
- `field-list` gets `mirror`: a plain field written from the preferred entry in the same PATCH (`email` from `emails[]`).
- New `field-groups` widget: several list fields in one card, each a field list in the pairs look, with one Add menu (in the card's title row with `add.placement: "title"`).
- New `object-links` widget: a record's links to other records kept as objects of a link schema, the type in words and the other record's name as a link; an add dialog that searches the target schemas, and remove; with `pair` the inverse link is written and removed too.

## Impact

No manifest schema change: widget `content` is open. Two new library widget keys (`field-groups`, `object-links`) in the library vocabulary. Every write goes to OpenRegister, which checks the user's rights before it writes. First consumer: pipelinq ClientDetail (PqKlant, PqOrganisatie).
