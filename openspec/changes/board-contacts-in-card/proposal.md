# The contacts tab in a card, as the board draws it

## Why
DqZaakBetrokkenen "Partijen" (r25b, 24 Oct) carried a 12px inset of the tab's own and right-aligned its buttons inside
the card. The board starts Contact koppelen, Nieuw contact and Partij toevoegen at the card's edge under the subtitle.
The empty state's second line, "Link a contact from your address book.", had no Dutch translation.

## What changes
- In the board look, the contacts tab inside a detail card (`cn-detail-page__leaf-card`) drops its own padding, and its
  button row starts at the card's edge. With the CSS injected on :8080, the buttons start at 315, the card's text edge.
- The empty line gets nl "Koppel een contact uit je adresboek.".
No schema change.
