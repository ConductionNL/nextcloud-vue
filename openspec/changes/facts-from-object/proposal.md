# Proposal: facts-from-object

## Why

Board PqTicket draws a "Klant" card in the side column: the client's initials, name and sub line, the ticket's
channel, the client's contact, and a link to the client. The `facts` widget draws such a card from one object, the
page's or a `source`, so the ticket's channel could not sit on the client's card.

## What changes

- An entry with `from: "object"` reads the page's own object while the card shows a `source`.

Without the flag nothing changes. No schema change (facts content is not schema-constrained).
