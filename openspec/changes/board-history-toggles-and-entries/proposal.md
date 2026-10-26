# The history checkboxes and entries as the board

## Why
r31's strict verdict on DqZaakHistorie:
- the "Ook wie de zaak las" and "Zichtbaar voor de verzoeker" checkboxes differ visually by 62–67%: a 34px padded row at 15px/500, where the board has a plain box with 14px text;
- each entry row read its head first (13px muted), where the board reads the message first at 15px.

## What changes
- The entry's message comes before its head in the markup. The default look keeps the head on top through `order`; the board look shows the message first, as before.
- In the board look, the history checkboxes drop the padded hit row and set their text at 14px/400, 8px after the box.
- With the CSS injected on :8080 the checkboxes measure 23px high and 152/205px wide, against the board's 24/18px and 157/205px.
