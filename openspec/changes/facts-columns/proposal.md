# Proposal: facts-columns

## Why

Board DqContact draws a person's "Contact" card as a two-column grid of facts, label above value: Naam, Voornamen
(name.givenNames), Geslachtsnaam (name.surname), Geboortedatum, Woonadres (street, number, postcode and city on one
line), Omschrijving. The `data` widget nests an object field as a list inside one field; `facts` reads dot paths but
draws one column with the label beside the value, and a row could not join parts.

## What changes

- `columns: 2` on facts: two columns, label above value, a hairline under each fact, one column on a phone.
- A row with `parts` joins them like a line; a part can be a group of parts with its own separator.

Without the key the card renders as before. No schema change.
