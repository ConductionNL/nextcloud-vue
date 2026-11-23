# The mail tab can preselect a template

## Why

DqZaakEmail draws the template field with "Ontvangstbevestiging Woo, versie 2" already selected, so "Concept openen uit sjabloon" is ready to use. CnMailTab never selected a template, so on :8080 the button stayed disabled until the reader picked one (DATA-34, DQ-C9 b).

## What changes

- `content.templates.preselect` picks a template once the list is read: `"first"`, `"only"` (exactly one template) or `{ field, value }` (the first template whose field holds the value).
- A pick the reader made stays while it is still in the list; a pick that left the list is replaced by the rule's choice, or cleared.
- Without `preselect` nothing is selected, as before.
