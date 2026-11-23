---
kind: code
depends_on: [screens-chrome-parity, screens-index-list-parity, index-ref-column-labels]
---

# Proposal: screens-cell-date-parity

## Summary

Three table-cell gaps from the round 6 app lanes, all about what one cell
says about a date or a reference:

1. pipelinq "Wachtend" (PqTickets): the board shows how long a ticket has
   waited, "4 uur", "1 dag", "3 dagen", in weight 600 and red ("3 dagen")
   when it is late. Live shows a relative date, "5 dagen geleden", never red.
   This adds a built-in `age` cell widget with the `variantWhen` threshold
   rules the `date` widget already uses. It builds on the `daysSince` work of
   #1408 (calendar days, the library's own plural catalogue) without changing
   that formatter: `daysSince` is a running phrase ("3 dagen geleden"), the
   age cell is a bare duration.
2. dossiq 17 (DqAanMijToegewezen): dates read "Feb 14, 2024" in a Dutch UI;
   the board shows "5 okt" (PqLeads "30 okt", "15 nov"). Under the board look
   a date cell takes the board's short form in the user's language, with the
   year only outside the current year. The words follow the Nextcloud
   LANGUAGE: an account whose locale is still the en_US default but whose
   language is Dutch read English month names.
3. pipelinq "Klant column" (PqTickets): the customer's name for a uuid
   reference without one request per row. The library already does this
   (`index-ref-column-labels`: a column `labelField` makes CnIndexPage
   resolve every id on the page in one batched request per referenced schema
   and render it through the `refLabel` cell). This change adds no code for
   it; it records the choice and proves the pipelinq shape with a test. The
   app declares `{ "key": "client", "label": "Klant", "labelField": "name" }`.

Without the board look the date cells render exactly as before; the `age`
widget is new and only renders where a column asks for it.

## Reference screens

| Screen | Live board |
|---|---|
| `pipelinq/PqTickets` (Wachtend, Klant) | https://identity.conduction.nl/screens/board?id=pipelinq/PqTickets |
| `pipelinq/PqLeads` (Verwachte afsluiting) | https://identity.conduction.nl/screens/board?id=pipelinq/PqLeads |
| `dossiq/DqAanMijToegewezen` (Termijn) | https://identity.conduction.nl/screens/board?id=dossiq/DqAanMijToegewezen |

## Consumers

- pipelinq Tickets: `{ "key": "occurredAt", "label": "Waiting", "widget": "age", "widgetProps": { "variantWhen": [{ "op": "gte", "value": 3, "variant": "error" }] } }` and the Klant column above.
- dossiq: nothing to declare; its date cells take the short form under `look: "board"`.
