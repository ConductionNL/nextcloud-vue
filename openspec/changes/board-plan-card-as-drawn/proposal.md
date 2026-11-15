# board-plan-card-as-drawn

## Why

r44 DqZaak and DqZaakMeer: "Zaakplan" is 5.3px taller than drawn, so Termijn en betaling, Flows and Uren registreren stand 3.5 to 4.3px low (Uren registreren flagged). The plan rows start 9.75px under the title (the card body's half-leading correction, but the rows carry their own padding), the Doelen footer row stands 10px under the plan where the board draws 4, and the header note "Mijlpalen en onderdelen van deze zaak" reads at 15px in the main ink: its style sat in CnDetailWidgetHost's scoped block while CnDetailWidgetHeaderItems renders it.

## What changes

- look-board-detail.css: a card opening on the plan or on a map takes a 12px content top (DqZaakMeer "Locaties" reads 9.8 once the note is 14px); a bare record list's footer row right after the plan takes a 4px top margin.
- CnDetailWidgetHeaderItems: the header note's style (muted, 14px, no wrap) moves into the component that renders it.
