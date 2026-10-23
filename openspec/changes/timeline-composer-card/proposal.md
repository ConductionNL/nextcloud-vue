# Proposal: timeline-composer-card

## Why

Board DqZaakHistorie draws the note form as its own card, "Notitie toevoegen",
under the "Historie van de zaak" card, with the checkbox at the start and the
button at the end of one row. The manage timeline drew the form inside the
history card, under a rule, with the button on its own line.

## What changes

- `composer: "only"`: the manage timeline draws the note form alone, so a page
  can stack it as a card of its own (its title and subtitle come from the card).
- `composer: "separate"`: the list draws no form but keeps "Add note", which
  brings the form card into view and focuses it.
- A note saved in the form card reloads the list of the same object
  (`cn:timeline:changed`).
- The form's checkbox and button share one row in every mode.
