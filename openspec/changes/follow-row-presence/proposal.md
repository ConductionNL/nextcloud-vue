# Proposal: follow-row-presence

## Why

DqZaak's follow row reads "AB Anouk Bakker kijkt nu ook naar deze zaak · Volgen": who else has the case open now, then
the Follow control, with no follower count. Live drew "2 volgers" and nothing about who is looking.

## What changes

`followRow` on a detail page (manifest `config.followRow`):

- `presence: true` subscribes to the record's presence and, while somebody else is there, draws their initials and one
  sentence ("{name} is also looking at this record now", or "{name} and 2 others …") before the Follow control.
- `count: false` draws no follower count.

Without the key nothing changes, and presence is not subscribed to.
