# The history composer and entries as the board

## Why
r31's strict verdict on DqZaakHistorie:
- the note field was 70px high where the board's is 89.5;
- the "Aan de tijdlijn toevoegen" button was 34px against 40;
- the title-row buttons were 8px apart against 12;
- the "Zichtbaar voor de verzoeker" pill was grey at 13px, where the board draws it teal at 12px.

## What changes
- The public entry pill gets its own class (`cn-timeline-manage__badge--public`).
- The board look sets the note field three lines high on a 1.5 line, the composer button at the board control height, the title-row buttons 12px apart, and the public pill in teal at 12px/600.
- With the rules injected on :8080: field 89.5, button 40, gap 12.
