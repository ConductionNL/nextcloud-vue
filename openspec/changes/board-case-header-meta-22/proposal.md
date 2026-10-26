# A case header puts its meta 22px under the title row

## Why

Every case board (DqZaak, DqZaakDocumenten, DqBesluit and the other case tabs) draws the header as three groups 22px apart: the title row with its buttons, then the pills and breadcrumb with Volgen 6px under them, then the stage bar. Live sets all header rows 6px apart, so the meta and everything under it sat 16px higher (r32: every card on the case boards y -16; probed on :8080: meta 46 vs 62, Volgen 73 vs 89, stages 123 vs 139). Contact, organisation, task and case type pages draw 6px, and have no stage bar.

## What changes

- Board look: in a detail header that holds a header widget (the stage bar), row 2 gets 16px more above it (6 + 16 = 22). Probed with the rule injected: meta 62, Volgen 89, stages 139, as drawn.
