# A record list avatar can draw two letters for one word

## Why

COMPDIFF r45 DqZaakGerelateerd: the board draws a related case's type initials as two letters ("OV" for Omgevingsvergunning, "AD" for Adviesaanvraag, "RE" for a series), the list one ("O", "A"), because a one-word name gives its first letter only.

## What changes

- `avatar: { text, letters: 2 }` gives the first two letters of a one-word name. A name of two words or more keeps its first and last initial. Without `letters` nothing changes.
- `avatar.text` may list candidate templates; the first that fills names the avatar.

## Impact

CnRecordListWidget and `initialsOf` (new optional argument), opt-in. No schema change (widget content is open).
